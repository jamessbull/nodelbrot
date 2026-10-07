import { createFloatContext, createFramebuffer, createProgram, createTexture, fullScreenVertexShader } from "./gl.js";
import { arrayTextureWidth, colourShader, iterateShader, packEscapesShader } from "./shaders.js";
import { lookupTableSize } from "../worker/pixelIterator.js";
import { maxRereferences, nearestUnescaped, rereferenceDue } from "../rereference.js";
import { createStopwatch } from "../stopwatch.js";

// Pixels can't be smaller than this on the GPU: it has only 32-bit floats, and their exponents run out
// soon after (about 1e-38). Deeper views are rendered on the CPU.
export const gpuSmallestPixel = 1e-30;

// Renders the interactive view on the GPU with WebGL2, a frame at a time, into the same buffers as the CPU
// renderer (see interactiveRenderer.js), handling the same events, so the rest of the explorer works the
// same with either. Every view is rendered by perturbation from referenceOrbit, which must be active for
// it (32-bit floats aren't precise enough to iterate even shallow views directly). Each frame advances
// the pixels on the GPU, packs their escape iterations and colours them (against the histogram as it
// was after the previous frame), and copies both back without waiting, finishing the frame once a fence
// says the GPU is done.
export function createGpuRenderer({width, height, events, imgData, escapeValues, xState, yState, imageEscapeValues,
        stopwatch = createStopwatch(), referenceOrbit}) {
    const gl = createFloatContext(width, height);
    if (!gl) {
        throw new Error("WebGL2 with float textures isn't available");
    }
    const on = events.listenTo;
    const iterate = createProgram(gl, fullScreenVertexShader, iterateShader);
    const pack = createProgram(gl, fullScreenVertexShader, packEscapesShader);
    const colour = createProgram(gl, fullScreenVertexShader, colourShader);
    gl.bindVertexArray(gl.createVertexArray());

    const floatTexture = () => createTexture(gl, gl.RGBA32F, width, height, gl.RGBA, gl.FLOAT);
    const states = [[floatTexture(), floatTexture()], [floatTexture(), floatTexture()]];
    const stateFramebuffers = states.map((pair) => createFramebuffer(gl, pair));
    let current = 0;                // which of states holds the pixels as they are
    const escapesFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.RGBA8, width, height, gl.RGBA, gl.UNSIGNED_BYTE)]);
    const colourFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.RGBA8, width, height, gl.RGBA, gl.UNSIGNED_BYTE)]);
    const escapesBuffer = gl.createBuffer();
    const colourBuffer = gl.createBuffer();
    [escapesBuffer, colourBuffer].forEach(function (buffer) {
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, width * height * 4, gl.STREAM_READ);
    });
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const escapeBytes = new Uint32Array(width * height);
    const paletteTexture = createTexture(gl, gl.RGBA8, 128, lookupTableSize / 128, gl.RGBA, gl.UNSIGNED_BYTE);

    // Iterations per frame, adjusted as the CPU renderer adjusts them.
    const initialStepSize = 95;
    const minStepSize = 5;
    const maxStepSize = 20000;
    let stepSize = initialStepSize;
    let currentIteration = 0;
    let frameIterations = 0;
    let view = null;
    let resetPending = false;       // the pixels must start again before the next frame
    let viewGeneration = 0;
    let frameGeneration = 0;
    let running = true;
    let inFlight = false;
    let frameWanted = false;
    let waitingForOrbit = false;
    let destroyed = false;
    let requestExaminePixelData = false;
    let frameSendsData = false;
    let rereferences = 0;
    let fence = null;
    // Iterations per frame follow how long the GPU spends on them. Finding out a frame has finished can
    // take far longer than the work (tens of milliseconds, in a hidden page), so the GPU's own timer is
    // used where there is one, and otherwise the frame's time less the shortest seen, as an estimate of
    // that delay.
    const gpuTimer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    let timerQuery = null;
    let shortestFrame = Infinity;

    // The reference orbit, as an RG float texture.
    let orbitTexture = null;
    let orbitRows = 0;
    let orbitGeneration = -1;
    let orbitUploaded = 0;          // values uploaded so far

    // The histogram, as an R float texture (empty to start with).
    let histogramTexture = createTexture(gl, gl.R32F, arrayTextureWidth, 1, gl.RED, gl.FLOAT);
    let histogramRows = 1;
    let histogramArray = null;
    let histogramFilled = 0;
    let histogramTotal = 0;

    const rowsFor = (length) => Math.max(1, Math.ceil(length / arrayTextureWidth));

    // The rows of an array texture holding entries from to end, as a padded Float32Array of
    // valuesPerEntry values each, from source.
    function rowsOf(source, from, end, valuesPerEntry) {
        const firstRow = Math.floor(from / arrayTextureWidth);
        const rows = rowsFor(end) - firstRow;
        const data = new Float32Array(rows * arrayTextureWidth * valuesPerEntry);
        const first = firstRow * arrayTextureWidth * valuesPerEntry;
        data.set(source.subarray(first, Math.min(source.length, end * valuesPerEntry)));
        return {firstRow, rows, data};
    }

    function uploadOrbit() {
        const length = referenceOrbit.length();
        const values = referenceOrbit.values();
        if (orbitGeneration !== referenceOrbit.generation() || rowsFor(length) > orbitRows) {
            orbitGeneration = referenceOrbit.generation();
            orbitRows = Math.max(rowsFor(length), 2 * orbitRows, 8);
            if (orbitRows > gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
                throw new Error("The reference orbit is too long for a texture");
            }
            if (orbitTexture) gl.deleteTexture(orbitTexture);
            orbitTexture = createTexture(gl, gl.RG32F, arrayTextureWidth, orbitRows, gl.RG, gl.FLOAT);
            orbitUploaded = 0;
        }
        if (length > orbitUploaded) {
            const {firstRow, rows, data} = rowsOf(values, orbitUploaded, length, 2);
            gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, firstRow, arrayTextureWidth, rows, gl.RG, gl.FLOAT, data);
            orbitUploaded = length;
        }
    }

    function uploadHistogram(info) {
        const dirtyFrom = histogramArray === info.array ? info.currentIteration : 0;
        if (histogramArray !== info.array || rowsFor(info.array.length) > histogramRows) {
            histogramRows = rowsFor(info.array.length);
            gl.deleteTexture(histogramTexture);
            histogramTexture = createTexture(gl, gl.R32F, arrayTextureWidth, histogramRows, gl.RED, gl.FLOAT);
            histogramArray = info.array;
        }
        if (info.filledLength > dirtyFrom) {
            const {firstRow, rows, data} = rowsOf(info.array, Math.min(dirtyFrom, info.filledLength), info.filledLength, 1);
            gl.bindTexture(gl.TEXTURE_2D, histogramTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, firstRow, arrayTextureWidth, rows, gl.RED, gl.FLOAT, data);
        }
        histogramFilled = info.filledLength;
        histogramTotal = info.total;
    }

    function clearStates() {
        gl.clearColor(0, 0, 0, 0);
        stateFramebuffers.forEach(function (framebuffer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        resetPending = false;
    }

    function bindTexture(unit, texture, program, name) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms[name], unit);
    }

    // The iterations there is reference orbit for (see interactiveRenderer.js).
    function orbitRoom() {
        return referenceOrbit.escaped() ? Infinity : referenceOrbit.length() - 2 - currentIteration;
    }

    function submitFrame() {
        if (destroyed) return;
        const room = orbitRoom();
        if (room < 1) {
            waitingForOrbit = true;
            referenceOrbit.want(currentIteration + stepSize + 2);
            return;
        }
        frameIterations = Math.min(stepSize, room);
        inFlight = true;
        frameWanted = false;
        frameSendsData = requestExaminePixelData;
        requestExaminePixelData = false;
        frameGeneration = viewGeneration;
        stopwatch.start();
        if (resetPending) clearStates();
        uploadOrbit();
        gl.viewport(0, 0, width, height);

        // Iterate, from one pair of state textures into the other.
        if (gpuTimer) {
            // One left from a frame whose results were dropped (the view changed) goes first.
            if (timerQuery) gl.deleteQuery(timerQuery);
            timerQuery = gl.createQuery();
            gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, timerQuery);
        }
        const offset = referenceOrbit.offset();
        gl.useProgram(iterate.program);
        bindTexture(0, states[current][0], iterate, "state0");
        bindTexture(1, states[current][1], iterate, "state1");
        bindTexture(2, orbitTexture, iterate, "orbit");
        gl.uniform1i(iterate.uniforms.orbitEnd, referenceOrbit.escaped() ? referenceOrbit.length() - 1 : -1);
        gl.uniform1f(iterate.uniforms.startIteration, currentIteration);
        gl.uniform1i(iterate.uniforms.iterations, frameIterations);
        gl.uniform2f(iterate.uniforms.dcTopLeft, (-((width - 1) / 2) - offset.x) * view.pixelSize, (-((height - 1) / 2) - offset.y) * view.pixelSize);
        gl.uniform1f(iterate.uniforms.pixelSize, view.pixelSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[1 - current]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (gpuTimer) {
            gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
        }
        current = 1 - current;

        // Escape iterations, packed into bytes, copied back.
        gl.useProgram(pack.program);
        bindTexture(0, states[current][0], pack, "state0");
        gl.bindFramebuffer(gl.FRAMEBUFFER, escapesFramebuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, escapesBuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);

        // Colours, copied back.
        gl.useProgram(colour.program);
        bindTexture(0, states[current][1], colour, "state1");
        bindTexture(1, histogramTexture, colour, "histogram");
        bindTexture(2, paletteTexture, colour, "palette");
        gl.uniform1f(colour.uniforms.histogramFilled, histogramFilled);
        gl.uniform1f(colour.uniforms.histogramCapacity, histogramArray ? histogramArray.length : 0);
        gl.uniform1f(colour.uniforms.histogramTotal, histogramTotal);
        gl.uniform1i(colour.uniforms.paletteSize, lookupTableSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, colourFramebuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, colourBuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        setTimeout(awaitFrame, 0);
    }

    function awaitFrame() {
        if (destroyed) return;
        const status = gl.clientWaitSync(fence, 0, 0);
        if (status === gl.TIMEOUT_EXPIRED) {
            setTimeout(awaitFrame, 1);
            return;
        }
        gl.deleteSync(fence);
        fence = null;
        if (status === gl.WAIT_FAILED) {
            fail("the GPU didn't finish a frame");
            return;
        }
        finishFrame();
    }

    function finishFrame() {
        stopwatch.stop();
        inFlight = false;
        if (frameGeneration === viewGeneration && !resetPending) {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, escapesBuffer);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, escapeBytes);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, colourBuffer);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, imgData);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            // The escapes in this frame, by iteration from its start, counted as the CPU renderer counts them.
            const frameStart = currentIteration;
            const update = new Uint32Array(frameIterations);
            for (let idx = 0; idx < escapeBytes.length; idx += 1) {
                const at = escapeBytes[idx] & 0xffffff;
                escapeValues[idx] = at;
                // 0 is for pixels yet to escape, which the first frame (from iteration 0) mustn't count.
                if (at !== 0 && at >= frameStart && at - frameStart < frameIterations) {
                    update[at - frameStart] += 1;
                }
            }
            events.fire(events.escapesFromWorkers, {update, currentIteration: frameStart});
            events.fire(events.depthReached, currentIteration);
            currentIteration += frameIterations;
            if (frameSendsData) {
                readExamineData();
                events.fire(events.pixelDataReady);
            }
            events.fire(events.frameComplete);
            updateStepSize(workTime());
            if (rereferences < maxRereferences && rereferenceDue(referenceOrbit, currentIteration)) {
                const nearest = nearestUnescaped(escapeValues, width, height);
                if (nearest) {
                    rereferences += 1;
                    referenceOrbit.rereference(nearest.dx, nearest.dy);
                }
            }
        }
        if (running || frameWanted) {
            submitFrame();
        }
    }

    // How long the GPU spent iterating in the frame just finished, in milliseconds.
    function workTime() {
        const elapsed = stopwatch.elapsed();
        shortestFrame = Math.min(shortestFrame, elapsed);
        let measured = null;
        if (timerQuery) {
            if (gl.getQueryParameter(timerQuery, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)) {
                measured = gl.getQueryParameter(timerQuery, gl.QUERY_RESULT) / 1e6;
            }
            gl.deleteQuery(timerQuery);
            timerQuery = null;
        }
        return measured !== null ? measured : Math.max(1, elapsed - shortestFrame);
    }

    // Each pixel's z and image escape iteration, for the examine panel.
    function readExamineData() {
        const state = new Float32Array(width * height * 4);
        const orbit = referenceOrbit.values();
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[current]);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, state);
        for (let idx = 0; idx < width * height; idx += 1) {
            const m = state[(idx * 4) + 2];
            xState[idx] = orbit[2 * m] + state[idx * 4];
            yState[idx] = orbit[(2 * m) + 1] + state[(idx * 4) + 1];
        }
        gl.readBuffer(gl.COLOR_ATTACHMENT1);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, state);
        for (let idx = 0; idx < width * height; idx += 1) {
            imageEscapeValues[idx] = state[idx * 4];
        }
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
    }

    function updateStepSize(elapsed) {
        if (elapsed >= 30 && elapsed <= 42) {
            return;
        }
        const scale = Math.min(2, Math.max(0.5, 36 / Math.max(elapsed, 1)));
        stepSize = Math.min(maxStepSize, Math.max(minStepSize, Math.round(stepSize * scale)));
    }

    // Stops rendering, rather than retrying something that may fail every frame.
    function fail(message) {
        console.error("Rendering stopped: " + message);
        inFlight = false;
        frameWanted = false;
        events.fire(events.stop);
    }

    function requestFrame() {
        if (inFlight || waitingForOrbit) {
            frameWanted = true;
        } else {
            submitFrame();
        }
    }

    function restartView() {
        viewGeneration += 1;
        currentIteration = 0;
        stepSize = initialStepSize;
        resetPending = true;
    }

    on(events.viewChanged, function (newView) {
        if (!referenceOrbit.active()) {
            throw new Error("The GPU renderer needs a reference orbit for every view");
        }
        view = newView;
        rereferences = 0;
        restartView();
    });

    on(events.referenceChanged, restartView);

    on(events.referenceOrbitGrew, function () {
        if (waitingForOrbit && orbitRoom() >= 1) {
            waitingForOrbit = false;
            if (running || frameWanted) {
                submitFrame();
            }
        }
    });

    on(events.paletteChanged, function (palette) {
        const table = palette.toLookupTable(lookupTableSize);
        gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, lookupTableSize / 128, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(table.buffer));
    });

    on(events.histogramChanged, uploadHistogram);

    function start() {
        running = true;
        if (!inFlight && !waitingForOrbit) {
            submitFrame();
        }
    }

    function stop() {
        running = false;
    }

    on(events.start, start);
    on(events.restart, start);
    on(events.stop, stop);
    on(events.showChanges, function () {
        if (!running) {
            requestFrame();
        }
    });
    on(events.startExamining, function () {
        requestExaminePixelData = true;
        requestFrame();
    });

    return {
        stop: stop,
        start: start,
        destroy: function () {
            destroyed = true;
            const lose = gl.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
        }
    };
}
