import { buildBlaInSteps } from "../worker/bla.js";
import { createTexture } from "./gl.js";
import { arrayTextureWidth, maxBlaLevels } from "./shaders.js";

// Runs of iterations are only taken while d^2 is at most 2^-24 of 2 Z d, the precision of the GPU's
// 32-bit floats (see bla.js).
const gpuTolerance = 2 ** -24;

// A bivariate linear approximation table (see bla.js) on the GPU, for the iterate shader. Deep in, A
// and B can be far bigger, and R far smaller, than 32-bit floats can hold, so each is kept as a mantissa
// and a power of two: A and B's mantissas in an RGBA float texture, and log2 R and the powers of A and
// B in another (as floats, which hold them exactly), with every level one after another in both, from
// start[level], count[level] runs long. With no orbit to speak of, levels is 0, and no runs are taken.
export function createGpuBla(gl) {
    let coefficients = createTexture(gl, gl.RGBA32F, 1, 1, gl.RGBA, gl.FLOAT);
    let scales = createTexture(gl, gl.RGBA32F, 1, 1, gl.RGBA, gl.FLOAT);
    let levels = 0;
    const start = new Int32Array(maxBlaLevels);
    const count = new Int32Array(maxBlaLevels);
    let mostLog2R = -Infinity;
    let built = null;           // what the table was made for: {generation, length, dcMax}

    // x, y as {x, y} mantissas and the power of two to multiply them by.
    function split(x, y) {
        const size = Math.max(Math.abs(x), Math.abs(y));
        if (size === 0 || !Number.isFinite(size)) {
            return {x: 0, y: 0, power: 0};
        }
        const power = Math.floor(Math.log2(size));
        // Scaled in two steps, as 2^-power alone can be out of range.
        const half = Math.trunc(-power / 2);
        const scale = (v) => v * (2 ** half) * (2 ** (-power - half));
        return {x: scale(x), y: scale(y), power};
    }

    // A table being made (see work): {key, steps}.
    let job = null;

    // Asks for the table for the orbit (of generation) with values (x, y pairs) of length values, and
    // pixels up to dcMax from its point. It is made again only if the orbit is another one, has doubled in
    // length (or is complete, and longer), or dcMax has grown past what it was made for. Making it takes a
    // while for long orbits, so it is done a slice at a time (see work), or at once with now: meanwhile, a
    // table for less of the same orbit goes on being used (it is right for as much as it covers), and one
    // for another orbit, or smaller dcMax, isn't.
    function update(generation, values, length, dcMax, complete, {now = false} = {}) {
        const wanted = {generation, length, dcMax: 2 ** Math.ceil(Math.log2(Math.max(dcMax, Number.MIN_VALUE)))};
        if (built && (built.generation !== generation || dcMax > built.dcMax)) {
            built = null;
            levels = 0;
        }
        const enough = (table) => table && table.generation === generation && dcMax <= table.dcMax &&
            (length === table.length || (!complete && length < 2 * table.length));
        if (!enough(built) && !(job && enough(job.key))) {
            job = {key: wanted, steps: make(values, wanted)};
        }
        if (now) {
            work(Infinity);
        }
    }

    // Works on the table being made for up to ms milliseconds, putting it in use if it is finished.
    function work(ms) {
        const until = performance.now() + ms;
        while (job && performance.now() < until) {
            const step = job.steps.next();
            if (step.done) {
                install(job.key, step.value);
                job = null;
            }
        }
    }

    function* make(values, key) {
        const table = (yield* buildBlaInSteps(values, key.length, key.dcMax, gpuTolerance)).levels.slice(0, maxBlaLevels);
        const layout = {start: new Int32Array(maxBlaLevels), count: new Int32Array(maxBlaLevels), levels: 0, mostLog2R: -Infinity};
        let total = 0;
        table.forEach(function (level, k) {
            layout.start[k] = total;
            layout.count[k] = level.length / 5;
            total += layout.count[k];
            if (layout.count[k] > 0) layout.levels = k + 1;
        });
        layout.rows = Math.max(1, Math.ceil(total / arrayTextureWidth));
        layout.ab = new Float32Array(layout.rows * arrayTextureWidth * 4);
        layout.powers = new Float32Array(layout.rows * arrayTextureWidth * 4);
        for (let k = 0; k < table.length; k += 1) {
            const level = table[k];
            for (let j = 0; j < layout.count[k]; j += 1) {
                const at = layout.start[k] + j;
                const a = split(level[5 * j], level[(5 * j) + 1]);
                const b = split(level[(5 * j) + 2], level[(5 * j) + 3]);
                const r = level[(5 * j) + 4];
                // log2 R, or as good as minus infinity where the run can't be taken.
                const log2R = r > 0 && Number.isFinite(r) ? Math.log2(r) : -1e30;
                layout.ab.set([a.x, a.y, b.x, b.y], 4 * at);
                layout.powers.set([log2R, a.power, b.power, 0], 4 * at);
                if (k === 0) layout.mostLog2R = Math.max(layout.mostLog2R, log2R);
                if ((j & 4095) === 4095) yield;
            }
        }
        return layout;
    }

    function install(key, layout) {
        gl.deleteTexture(coefficients);
        gl.deleteTexture(scales);
        coefficients = createTexture(gl, gl.RGBA32F, arrayTextureWidth, layout.rows, gl.RGBA, gl.FLOAT, layout.ab);
        scales = createTexture(gl, gl.RGBA32F, arrayTextureWidth, layout.rows, gl.RGBA, gl.FLOAT, layout.powers);
        start.set(layout.start);
        count.set(layout.count);
        levels = layout.levels;
        mostLog2R = layout.mostLog2R;
        built = key;
    }

    // Binds the table to texture units unit and unit + 1 for program, and sets its uniforms.
    function use(program, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, coefficients);
        gl.uniform1i(program.uniforms.blaCoefficients, unit);
        gl.activeTexture(gl.TEXTURE0 + unit + 1);
        gl.bindTexture(gl.TEXTURE_2D, scales);
        gl.uniform1i(program.uniforms.blaScales, unit + 1);
        gl.uniform1i(program.uniforms.blaLevels, levels);
        gl.uniform1iv(program.uniforms["blaStart[0]"], start);
        gl.uniform1iv(program.uniforms["blaCount[0]"], count);
        gl.uniform1f(program.uniforms.blaMostLog2R, Number.isFinite(mostLog2R) ? mostLog2R : -1e30);
    }

    return {update, work, use};
}
