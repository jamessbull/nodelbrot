import { createFloatContext, createFramebuffer, createProgram, createTexture, fullScreenVertexShader } from "./gl.js";
import { arrayTextureWidth, deepGpuPixel, iterateShader, placePixels } from "./shaders.js";
import { colourPixels, lookupTableSize } from "../worker/pixelIterator.js";
import { inMainCardioidOrBulb } from "../mandelbrotPoint.js";
import { createGpuBla } from "./gpuBla.js";

// Each pixel is done when it has escaped or is known to be in the set: the fragment is kept, for an
// occlusion query to count, only for those still going.
const stillGoingShader = `#version 300 es
precision highp float;
uniform highp sampler2D state1;
out vec4 colour;
void main() {
    if (texelFetch(state1, ivec2(gl_FragCoord.xy), 0).x != 0.0) {
        discard;
    }
    colour = vec4(1.0);
}`;

// Renders an export on the GPU, as renderExport (see exportRenderer.js) does on the CPU, by perturbation
// in 32-bit floats as the GPU renderer does (see gpuRenderer.js). extents is the area relative to the
// reference orbit's point, orbit the orbit {values, complete}, worked out to at least depth + 2 values
// (or complete). Where doubles are precise enough, point is where that is, {x, y}, and pixels in the
// main cardioid or the period-2 bulb are marked as in the set before starting, rather than iterated to
// depth (the GPU can't tell, as it doesn't know where pixels are precisely enough).
//
// Pixels whose iteration comes round to exactly where it was are in the set too (see shaders.js), and
// runs of iterations are taken in one step where they can be. The image is done in tiles, each iterated
// in passes of about passMs of GPU work (so as not to hold the GPU so long the browser takes it away),
// until every pixel is done or depth is reached. Each pixel's escapes are counted into a histogram of
// the whole image, and the image is coloured against that once every tile is done. Calls onProgress("image",
// pixels) as tiles are done, onComplete(image) with the RGBA data, and onError(message) if the GPU can't
// do it, after which nothing more is called.
export function renderExportOnGpu({extents, width, height, depth, orbit, palette, point = null, onProgress = () => {}, onComplete,
        onError, tileWidth = 1024, tileHeight = 512, passMs = 30}) {
    const tileW = Math.min(tileWidth, width);
    const tileH = Math.min(tileHeight, height);
    const gl = createFloatContext(tileW, tileH);
    if (!gl) {
        onError("the GPU can't render exports here");
        return;
    }
    let failed = false;
    let finished = false;
    function fail(message) {
        if (!failed && !finished) {
            failed = true;
            cleanUp();
            onError(message);
        }
    }
    gl.canvas.addEventListener("webglcontextlost", () => fail("the GPU stopped working"));
    function cleanUp() {
        const lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
    }

    const stepX = extents.width() / (width - 1);
    const stepY = extents.height() / (height - 1);
    const deep = Math.max(stepX, stepY) < deepGpuPixel;
    const iterate = createProgram(gl, fullScreenVertexShader, iterateShader(deep));
    const stillGoing = createProgram(gl, fullScreenVertexShader, stillGoingShader);
    gl.bindVertexArray(gl.createVertexArray());
    const floatTexture = () => createTexture(gl, gl.RGBA32F, tileW, tileH, gl.RGBA, gl.FLOAT);
    const states = [[floatTexture(), floatTexture(), floatTexture()], [floatTexture(), floatTexture(), floatTexture()]];
    const stateFramebuffers = states.map((set) => createFramebuffer(gl, set));
    const countFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.R8, tileW, tileH, gl.RED, gl.UNSIGNED_BYTE)]);
    const gpuTimer = gl.getExtension("EXT_disjoint_timer_query_webgl2");

    // The orbit, as an RG float texture (see gpuRenderer.js).
    const orbitLength = orbit.values.length / 2;
    const orbitRows = Math.max(1, Math.ceil(orbitLength / arrayTextureWidth));
    if (orbitRows > gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
        fail("the reference orbit is too long for the GPU");
        return;
    }
    const orbitData = new Float32Array(orbitRows * arrayTextureWidth * 2);
    orbitData.set(orbit.values);
    const orbitTexture = createTexture(gl, gl.RG32F, arrayTextureWidth, orbitRows, gl.RG, gl.FLOAT, orbitData);
    // Runs of iterations to take in one step, for the furthest corner of the image from the orbit's point.
    const bla = createGpuBla(gl);
    const corners = [extents.topLeft().x, extents.topLeft().x + extents.width()].map(Math.abs);
    const sides = [extents.topLeft().y, extents.topLeft().y + extents.height()].map(Math.abs);
    bla.update(0, orbit.values, orbitLength, Math.hypot(Math.max(...corners), Math.max(...sides)), orbit.complete, {now: true});

    const counts = new Uint32Array(depth + 2);
    const smooth = new Float32Array(width * height);
    let escaped = 0;
    const tiles = [];
    for (let y = 0; y < height; y += tileH) {
        for (let x = 0; x < width; x += tileW) {
            tiles.push({x, y, w: Math.min(tileW, width - x), h: Math.min(tileH, height - y)});
        }
    }

    function bind(unit, texture, program, name) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms[name], unit);
    }

    // The tile's pixels to start from: none moved, and those in the main cardioid or bulb marked as in
    // the set (imageEscapedAt -1).
    function startTile(tile) {
        const start = new Float32Array(tileW * tileH * 4);
        if (point) {
            for (let j = 0; j < tile.h; j += 1) {
                const cy = point.y + extents.topLeft().y + ((tile.y + j) * stepY);
                for (let i = 0; i < tile.w; i += 1) {
                    if (inMainCardioidOrBulb(point.x + extents.topLeft().x + ((tile.x + i) * stepX), cy)) {
                        start[4 * ((j * tileW) + i)] = -1;
                    }
                }
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[0]);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, states[0][1]);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, tileW, tileH, gl.RGBA, gl.FLOAT, start);
        return 0;
    }

    // Iterations, from startIteration, of the tile in states[current], into the other set, with a query
    // for whether any pixel is still going after them, and the GPU time they took.
    function pass(tile, current, startIteration, iterations) {
        gl.viewport(0, 0, tileW, tileH);
        const timer = gpuTimer ? gl.createQuery() : null;
        if (timer) gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, timer);
        gl.useProgram(iterate.program);
        bind(0, states[current][0], iterate, "state0");
        bind(1, states[current][1], iterate, "state1");
        bind(2, states[current][2], iterate, "state2");
        bind(3, orbitTexture, iterate, "orbit");
        bla.use(iterate, 4);
        gl.uniform1i(iterate.uniforms.orbitEnd, orbit.complete ? orbitLength - 1 : -1);
        gl.uniform1f(iterate.uniforms.startIteration, startIteration);
        gl.uniform1i(iterate.uniforms.iterations, iterations);
        placePixels(gl, iterate, extents.topLeft().x + (tile.x * stepX), extents.topLeft().y + (tile.y * stepY), stepX, stepY, deep);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[1 - current]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (timer) gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
        // Any pixel of the tile still going? (Only the tile's own part of the texture.)
        gl.viewport(0, 0, tile.w, tile.h);
        gl.useProgram(stillGoing.program);
        bind(0, states[1 - current][1], stillGoing, "state1");
        gl.bindFramebuffer(gl.FRAMEBUFFER, countFramebuffer);
        const going = gl.createQuery();
        gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, going);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE);
        const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        return {timer, going, fence, submitted: performance.now()};
    }

    function whenDone(submitted) {
        return new Promise(function (resolve) {
            (function poll() {
                if (failed) return;
                const status = gl.clientWaitSync(submitted.fence, 0, 0);
                if (status === gl.TIMEOUT_EXPIRED) {
                    setTimeout(poll, 1);
                    return;
                }
                gl.deleteSync(submitted.fence);
                if (status === gl.WAIT_FAILED) {
                    fail("the GPU didn't finish");
                    return;
                }
                let ms = performance.now() - submitted.submitted;
                if (submitted.timer && gl.getQueryParameter(submitted.timer, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)) {
                    ms = gl.getQueryParameter(submitted.timer, gl.QUERY_RESULT) / 1e6;
                }
                if (submitted.timer) gl.deleteQuery(submitted.timer);
                // The query result may not be in yet: then carry on as if some pixels were still going.
                const known = gl.getQueryParameter(submitted.going, gl.QUERY_RESULT_AVAILABLE);
                const going = !known || gl.getQueryParameter(submitted.going, gl.QUERY_RESULT);
                gl.deleteQuery(submitted.going);
                resolve({ms, going});
            }());
        });
    }

    // The tile's escapes go in the histogram, and its smoothed escape iterations in smooth.
    function finishTile(tile, current) {
        const state = new Float32Array(tileW * tileH * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[current]);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, tileW, tileH, gl.RGBA, gl.FLOAT, state);
        for (let j = 0; j < tile.h; j += 1) {
            for (let i = 0; i < tile.w; i += 1) {
                const at = state[(4 * ((j * tileW) + i)) + 3];
                if (at > 0 && at <= depth) {
                    counts[at] += 1;
                    escaped += 1;
                }
            }
        }
        gl.readBuffer(gl.COLOR_ATTACHMENT1);
        gl.readPixels(0, 0, tileW, tileH, gl.RGBA, gl.FLOAT, state);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        for (let j = 0; j < tile.h; j += 1) {
            for (let i = 0; i < tile.w; i += 1) {
                const s = 4 * ((j * tileW) + i);
                // Escaped, by the depth: its smoothed iteration (more than 0); otherwise 0, black.
                smooth[((tile.y + j) * width) + tile.x + i] = state[s] > 0 && state[s] <= depth ? state[s + 1] : 0;
            }
        }
    }

    async function renderTile(tile, stepSize) {
        let current = startTile(tile);
        let reached = 0;
        let step = stepSize;
        while (reached < depth) {
            const iterations = Math.min(step, depth - reached);
            const done = await whenDone(pass(tile, current, reached, iterations));
            if (failed) return step;
            current = 1 - current;
            reached += iterations;
            if (!done.going) break;
            // Towards passMs a pass, by at most a factor of two at a time.
            step = Math.max(1, Math.round(step * Math.min(2, Math.max(0.5, passMs / Math.max(done.ms, 0.1)))));
        }
        finishTile(tile, current);
        onProgress("image", tile.w * tile.h);
        return step;
    }

    (async function () {
        try {
            let step = 100;
            for (const tile of tiles) {
                step = await renderTile(tile, step);
                if (failed) return;
            }
            finished = true;
            cleanUp();
            // Coloured against the whole image's histogram, cumulative as colourPixels wants it.
            for (let i = 1; i < counts.length; i += 1) {
                counts[i] += counts[i - 1];
            }
            const image = new Uint8ClampedArray(width * height * 4);
            colourPixels(image, smooth, smooth, counts, counts.length, escaped, palette.toLookupTable(lookupTableSize));
            onComplete(image);
        } catch (e) {
            fail(e.message);
        }
    }());
}
