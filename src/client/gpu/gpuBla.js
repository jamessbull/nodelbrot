import { buildBla } from "../worker/bla.js";
import { createTexture } from "./gl.js";
import { arrayTextureWidth, maxBlaLevels } from "./shaders.js";

// Runs of iterations are only taken while d^2 is at most 2^-24 of 2 Z d, the precision of the GPU's
// 32-bit floats (see bla.js).
const gpuTolerance = 2 ** -24;

// A bivariate linear approximation table (see bla.js) on the GPU, for the iterate shader: each run's A
// and B as an RGBA float texture, and its R as an R float texture, with every level one after another in
// both, from start[level], count[level] runs long. Runs whose numbers are too big for 32-bit floats get
// no R, so are never taken. With no orbit to speak of, levels is 0, and no runs are taken.
export function createGpuBla(gl) {
    let coefficients = createTexture(gl, gl.RGBA32F, 1, 1, gl.RGBA, gl.FLOAT);
    let radii = createTexture(gl, gl.R32F, 1, 1, gl.RED, gl.FLOAT);
    let levels = 0;
    const start = new Int32Array(maxBlaLevels);
    const count = new Int32Array(maxBlaLevels);
    let mostRSquared = 0;
    let built = null;           // what the table was made for: {generation, length, dcMax}

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
        mostRSquared = 0;
        table.forEach(function (level, k) {
            start[k] = total;
            count[k] = level.length / 5;
            total += count[k];
            if (count[k] > 0) levels = k + 1;
        });
        const rows = Math.max(1, Math.ceil(total / arrayTextureWidth));
        const ab = new Float32Array(rows * arrayTextureWidth * 4);
        const r = new Float32Array(rows * arrayTextureWidth);
        table.forEach(function (level, k) {
            for (let j = 0; j < count[k]; j += 1) {
                const at = start[k] + j;
                const values32 = [level[5 * j], level[(5 * j) + 1], level[(5 * j) + 2], level[(5 * j) + 3]].map(Math.fround);
                const radius = Math.fround(level[(5 * j) + 4]);
                const usable = values32.every(Number.isFinite) && Number.isFinite(radius);
                ab.set(usable ? values32 : [0, 0, 0, 0], 4 * at);
                r[at] = usable ? radius : 0;
                if (usable && k === 0) mostRSquared = Math.max(mostRSquared, radius * radius);
            }
        });
        gl.deleteTexture(coefficients);
        gl.deleteTexture(radii);
        coefficients = createTexture(gl, gl.RGBA32F, arrayTextureWidth, rows, gl.RGBA, gl.FLOAT, ab);
        radii = createTexture(gl, gl.R32F, arrayTextureWidth, rows, gl.RED, gl.FLOAT, r);
    }

    // Binds the table to texture units unit and unit + 1 for program, and sets its uniforms.
    function use(program, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, coefficients);
        gl.uniform1i(program.uniforms.blaCoefficients, unit);
        gl.activeTexture(gl.TEXTURE0 + unit + 1);
        gl.bindTexture(gl.TEXTURE_2D, radii);
        gl.uniform1i(program.uniforms.blaRadii, unit + 1);
        gl.uniform1i(program.uniforms.blaLevels, levels);
        gl.uniform1iv(program.uniforms["blaStart[0]"], start);
        gl.uniform1iv(program.uniforms["blaCount[0]"], count);
        gl.uniform1f(program.uniforms.blaMostRSquared, mostRSquared);
    }

    return {update, use};
}
