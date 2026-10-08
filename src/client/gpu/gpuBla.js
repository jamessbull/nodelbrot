import { buildBla } from "../worker/bla.js";
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

    // The table for the orbit (of generation) with values (x, y pairs) of length values, and pixels up to
    // dcMax from its point, made again only if the orbit is another one, has doubled in length (or is
    // complete, and longer), or dcMax has grown past what it was made for.
    function update(generation, values, length, dcMax, complete) {
        if (built && built.generation === generation && dcMax <= built.dcMax &&
                (length === built.length || (!complete && length < 2 * built.length))) {
            return;
        }
        built = {generation, length, dcMax: 2 ** Math.ceil(Math.log2(Math.max(dcMax, Number.MIN_VALUE)))};
        const table = buildBla(values, length, built.dcMax, gpuTolerance).levels.slice(0, maxBlaLevels);
        let total = 0;
        levels = 0;
        mostLog2R = -Infinity;
        table.forEach(function (level, k) {
            start[k] = total;
            count[k] = level.length / 5;
            total += count[k];
            if (count[k] > 0) levels = k + 1;
        });
        const rows = Math.max(1, Math.ceil(total / arrayTextureWidth));
        const ab = new Float32Array(rows * arrayTextureWidth * 4);
        const powers = new Float32Array(rows * arrayTextureWidth * 4);
        table.forEach(function (level, k) {
            for (let j = 0; j < count[k]; j += 1) {
                const at = start[k] + j;
                const a = split(level[5 * j], level[(5 * j) + 1]);
                const b = split(level[(5 * j) + 2], level[(5 * j) + 3]);
                const r = level[(5 * j) + 4];
                // log2 R, or as good as minus infinity where the run can't be taken.
                const log2R = r > 0 && Number.isFinite(r) ? Math.log2(r) : -1e30;
                ab.set([a.x, a.y, b.x, b.y], 4 * at);
                powers.set([log2R, a.power, b.power, 0], 4 * at);
                if (k === 0) mostLog2R = Math.max(mostLog2R, log2R);
            }
        });
        gl.deleteTexture(coefficients);
        gl.deleteTexture(scales);
        coefficients = createTexture(gl, gl.RGBA32F, arrayTextureWidth, rows, gl.RGBA, gl.FLOAT, ab);
        scales = createTexture(gl, gl.RGBA32F, arrayTextureWidth, rows, gl.RGBA, gl.FLOAT, powers);
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

    return {update, use};
}
