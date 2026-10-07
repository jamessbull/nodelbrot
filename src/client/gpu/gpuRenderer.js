import { createFloatContext, createFramebuffer, createProgram, createTexture, fullScreenVertexShader } from "./gl.js";
import { arrayTextureWidth, colourShader, countEscapesShader, countEscapesVertexShader, iterateShader } from "./shaders.js";
import { lookupTableSize } from "../worker/pixelIterator.js";
import { maxRereferences, nearestUnescaped, rereferenceDue } from "../rereference.js";

// Pixels can't be smaller than this on the GPU: it has only 32-bit floats, and their exponents run out
// soon after (about 1e-38). Deeper views are rendered on the CPU.
export const gpuSmallestPixel = 1e-30;

// Renders the interactive view on the GPU with WebGL2, a frame at a time, handling the same events as the
// CPU renderer (see interactiveRenderer.js), so the rest of the explorer works the same with either. Every
// view is rendered by perturbation from referenceOrbit, which must be active for it (32-bit floats aren't
// precise enough to iterate even shallow views directly). Each frame advances the pixels on the GPU and
// counts their escapes by iteration there, copying back just the counts, for the histogram. Finding out
// the GPU is done with a frame takes a while, so a few are kept in flight. As each finishes, the pixels are
// coloured onto the renderer's canvas, which the display draws from. Only the examine panel and
// re-referencing need the pixels themselves (in imgData, escapeValues, xState, yState and
// imageEscapeValues), so they are copied back only for those.
export function createGpuRenderer({width, height, events, imgData, escapeValues, xState, yState, imageEscapeValues,
        referenceOrbit}) {
    const gl = createFloatContext(width, height);
    if (!gl) {
        throw new Error("WebGL2 with float textures isn't available");
    }
    const on = events.listenTo;
    const iterate = createProgram(gl, fullScreenVertexShader, iterateShader);
    const count = createProgram(gl, countEscapesVertexShader, countEscapesShader);
    const colour = createProgram(gl, fullScreenVertexShader, colourShader);
    gl.bindVertexArray(gl.createVertexArray());

    const floatTexture = () => createTexture(gl, gl.RGBA32F, width, height, gl.RGBA, gl.FLOAT);
    const states = [[floatTexture(), floatTexture()], [floatTexture(), floatTexture()]];
    const stateFramebuffers = states.map((pair) => createFramebuffer(gl, pair));
    let current = 0;                // which of states holds the pixels as they are
    const colourFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.RGBA8, width, height, gl.RGBA, gl.UNSIGNED_BYTE)]);

    // Iterations per frame, adjusted so the GPU spends about frameTarget milliseconds on each. With the
    // frames overlapping, that is about how often they finish.
    const initialStepSize = 95;
    const minStepSize = 5;
    const maxStepSize = 20000;
    const frameTarget = {low: 22, aim: 26, high: 30};

    // The counts of escapes in a frame, by iteration from its start.
    const countRows = Math.ceil(maxStepSize / arrayTextureWidth);
    const countFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.RGBA32F, arrayTextureWidth, countRows, gl.RGBA, gl.FLOAT)]);
    const counts = new Float32Array(arrayTextureWidth * countRows * 4);

    // Frames in flight, oldest first. Each copies its escape counts back into a buffer of its own, which
    // goes back in spareFrames once it's finished.
    const maxFramesInFlight = 3;
    const framesInFlight = [];
    const spareFrames = [];
    const paletteTexture = createTexture(gl, gl.RGBA8, 128, lookupTableSize / 128, gl.RGBA, gl.UNSIGNED_BYTE);

    let stepSize = initialStepSize;
    let currentIteration = 0;       // the depth of the frames finished
    let submittedIteration = 0;     // the depth the frames in flight will reach
    let view = null;
    let resetPending = false;       // the pixels must start again before the next frame
    let viewGeneration = 0;
    let running = true;
    let frameWanted = false;
    let waitingForOrbit = false;
    let destroyed = false;
    let polling = false;
    let requestExaminePixelData = false;
    let examining = false;
    let rereferences = 0;
    // Iterations per frame follow how long the GPU spends on them. Finding out a frame has finished can
    // take far longer than the work (tens of milliseconds, in a hidden page), so the GPU's own timer is
    // used where there is one, and otherwise the time since the frame before finished (or since this one
    // went in, if later), less the shortest seen, as an estimate of that delay.
    const gpuTimer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    let shortestFrame = Infinity;
    let lastFinished = 0;

    function newFrame() {
        const frame = {countsBuffer: gl.createBuffer()};
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, frame.countsBuffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, counts.byteLength, gl.STREAM_READ);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        return frame;
    }

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

    // The iterations there is reference orbit for past the frames in flight (see interactiveRenderer.js).
    function orbitRoom() {
        return referenceOrbit.escaped() ? Infinity : referenceOrbit.length() - 2 - submittedIteration;
    }

    // No frame goes in after one fetching data for the examine panel, which reads the pixels' state as
    // that frame leaves it.
    const canSubmit = () => framesInFlight.length < maxFramesInFlight && !framesInFlight.some((frame) => frame.sendsData);

    // Puts frames in, as many as can be in flight, while rendering or a frame is wanted.
    function submitFrames() {
        while (!destroyed && !waitingForOrbit && (running || frameWanted) && canSubmit()) {
            submitFrame();
        }
        if (framesInFlight.length > 0 && !polling) {
            polling = true;
            setTimeout(poll, 1);
        }
    }

    function submitFrame() {
        const room = orbitRoom();
        if (room < 1) {
            waitingForOrbit = true;
            referenceOrbit.want(submittedIteration + stepSize + 2);
            return;
        }
        const frame = spareFrames.pop() || newFrame();
        frame.start = submittedIteration;
        frame.stepSize = stepSize;
        frame.iterations = Math.min(stepSize, room);
        frame.generation = viewGeneration;
        frame.sendsData = requestExaminePixelData || examining;
        frame.submitted = performance.now();
        frameWanted = false;
        requestExaminePixelData = false;
        submittedIteration += frame.iterations;
        if (resetPending) clearStates();
        uploadOrbit();
        gl.viewport(0, 0, width, height);

        // Iterate, from one pair of state textures into the other.
        frame.timerQuery = null;
        if (gpuTimer) {
            frame.timerQuery = gl.createQuery();
            gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, frame.timerQuery);
        }
        const offset = referenceOrbit.offset();
        gl.useProgram(iterate.program);
        bindTexture(0, states[current][0], iterate, "state0");
        bindTexture(1, states[current][1], iterate, "state1");
        bindTexture(2, orbitTexture, iterate, "orbit");
        gl.uniform1i(iterate.uniforms.orbitEnd, referenceOrbit.escaped() ? referenceOrbit.length() - 1 : -1);
        gl.uniform1f(iterate.uniforms.startIteration, frame.start);
        gl.uniform1i(iterate.uniforms.iterations, frame.iterations);
        gl.uniform2f(iterate.uniforms.dcTopLeft, (-((width - 1) / 2) - offset.x) * view.pixelSize, (-((height - 1) / 2) - offset.y) * view.pixelSize);
        gl.uniform1f(iterate.uniforms.pixelSize, view.pixelSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[1 - current]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (gpuTimer) {
            gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
        }
        current = 1 - current;

        // The escapes, counted by iteration, copied back.
        const rows = Math.ceil(frame.iterations / arrayTextureWidth);
        gl.useProgram(count.program);
        bindTexture(0, states[current][0], count, "state0");
        gl.uniform1i(count.uniforms.stateWidth, width);
        gl.uniform1f(count.uniforms.startIteration, frame.start);
        gl.uniform1i(count.uniforms.iterations, frame.iterations);
        gl.uniform1i(count.uniforms.rows, rows);
        gl.bindFramebuffer(gl.FRAMEBUFFER, countFramebuffer);
        gl.viewport(0, 0, arrayTextureWidth, rows);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.POINTS, 0, width * height);
        gl.disable(gl.BLEND);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, frame.countsBuffer);
        gl.readPixels(0, 0, arrayTextureWidth, rows, gl.RGBA, gl.FLOAT, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        frame.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        framesInFlight.push(frame);
    }

    // Finishes the frames the GPU is done with, oldest first, and puts in more.
    function poll() {
        polling = false;
        if (destroyed) return;
        while (framesInFlight.length > 0) {
            const frame = framesInFlight[0];
            const status = gl.clientWaitSync(frame.fence, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) {
                break;
            }
            framesInFlight.shift();
            if (status === gl.WAIT_FAILED) {
                fail("the GPU didn't finish a frame");
                return;
            }
            finishFrame(frame);
            gl.deleteSync(frame.fence);
            spareFrames.push(frame);
        }
        submitFrames();
    }

    function finishFrame(frame) {
        const work = workTime(frame);
        // Frames from before the view changed are dropped.
        if (frame.generation !== viewGeneration) {
            return;
        }
        gl.bindBuffer(gl.COPY_READ_BUFFER, frame.countsBuffer);
        gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, counts, 0, arrayTextureWidth * Math.ceil(frame.iterations / arrayTextureWidth) * 4);
        gl.bindBuffer(gl.COPY_READ_BUFFER, null);
        const update = new Uint32Array(frame.iterations);
        for (let n = 0; n < frame.iterations; n += 1) {
            update[n] = counts[4 * n];
        }
        events.fire(events.escapesFromWorkers, {update, currentIteration: frame.start});
        events.fire(events.depthReached, frame.start);
        currentIteration = frame.start + frame.iterations;
        drawImage();
        if (frame.sendsData) {
            readExamineData();
            events.fire(events.pixelDataReady);
        }
        events.fire(events.frameComplete);
        updateStepSize(frame, work);
        if (running && rereferences < maxRereferences && rereferenceDue(referenceOrbit, currentIteration)) {
            readEscapeValues();
            const nearest = nearestUnescaped(escapeValues, width, height);
            if (nearest) {
                rereferences += 1;
                referenceOrbit.rereference(nearest.dx, nearest.dy);
            }
        }
    }

    // How long the GPU spent iterating in a frame just finished, in milliseconds.
    function workTime(frame) {
        const now = performance.now();
        const elapsed = now - Math.max(frame.submitted, lastFinished);
        lastFinished = now;
        shortestFrame = Math.min(shortestFrame, elapsed);
        let measured = null;
        if (frame.timerQuery) {
            if (gl.getQueryParameter(frame.timerQuery, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)) {
                measured = gl.getQueryParameter(frame.timerQuery, gl.QUERY_RESULT) / 1e6;
            }
            gl.deleteQuery(frame.timerQuery);
            frame.timerQuery = null;
        }
        return measured !== null ? measured : Math.max(1, elapsed - shortestFrame);
    }

    // Colours the pixels, against the histogram as of the frames finished, onto the canvas, from which
    // the display draws them (see imageRenderer.js) without copying them back. The pixels may have gone
    // on further in the frames still in flight, and those that escaped there are left black for now.
    function drawImage() {
        gl.viewport(0, 0, width, height);
        gl.useProgram(colour.program);
        bindTexture(0, states[current][1], colour, "state1");
        bindTexture(1, histogramTexture, colour, "histogram");
        bindTexture(2, paletteTexture, colour, "palette");
        gl.uniform1f(colour.uniforms.depth, currentIteration);
        gl.uniform1f(colour.uniforms.histogramFilled, histogramFilled);
        gl.uniform1f(colour.uniforms.histogramCapacity, histogramArray ? histogramArray.length : 0);
        gl.uniform1f(colour.uniforms.histogramTotal, histogramTotal);
        gl.uniform1i(colour.uniforms.paletteSize, lookupTableSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, colourFramebuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        // Onto the canvas, upside down, as its rows go up from the bottom.
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, colourFramebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0, 0, width, height, 0, height, width, 0, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Each pixel's escape iteration (or 0), as of the frames finished, waiting for the GPU. Only the
    // examine panel and re-referencing need them, so they aren't copied back every frame.
    function readEscapeValues() {
        const state = readState(stateFramebuffers[current], gl.COLOR_ATTACHMENT0);
        for (let idx = 0; idx < width * height; idx += 1) {
            const at = state[(idx * 4) + 3];
            escapeValues[idx] = at <= currentIteration ? at : 0;
        }
        return state;
    }

    function readState(framebuffer, attachment) {
        const state = new Float32Array(width * height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.readBuffer(attachment);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, state);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        return state;
    }

    // Each pixel's colour, escape iteration, z and image escape iteration, for the examine panel. Frames
    // don't go in while one fetching these is out, so the pixels are as that frame left them.
    function readExamineData() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, colourFramebuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
        const orbit = referenceOrbit.values();
        let state = readEscapeValues();
        for (let idx = 0; idx < width * height; idx += 1) {
            const m = state[(idx * 4) + 2];
            xState[idx] = orbit[2 * m] + state[idx * 4];
            yState[idx] = orbit[(2 * m) + 1] + state[(idx * 4) + 1];
        }
        state = readState(stateFramebuffers[current], gl.COLOR_ATTACHMENT1);
        for (let idx = 0; idx < width * height; idx += 1) {
            imageEscapeValues[idx] = state[idx * 4];
        }
    }

    // Scales the step size the frame went in with (frames that came after it may have changed it since)
    // towards the aim, by at most a factor of two so one odd frame can't swing it too far. Frames cut
    // short by the reference orbit are counted as if they had been the full size.
    function updateStepSize(frame, work) {
        const fullWork = work * frame.stepSize / frame.iterations;
        if (fullWork >= frameTarget.low && fullWork <= frameTarget.high) {
            return;
        }
        const scale = Math.min(2, Math.max(0.5, frameTarget.aim / Math.max(fullWork, 1)));
        stepSize = Math.min(maxStepSize, Math.max(minStepSize, Math.round(frame.stepSize * scale)));
    }

    // Stops rendering, rather than retrying something that may fail every frame.
    function fail(message) {
        console.error("Rendering stopped: " + message);
        framesInFlight.forEach((frame) => gl.deleteSync(frame.fence));
        spareFrames.push(...framesInFlight.splice(0));
        frameWanted = false;
        events.fire(events.stop);
    }

    function requestFrame() {
        frameWanted = true;
        submitFrames();
    }

    function restartView() {
        viewGeneration += 1;
        currentIteration = 0;
        submittedIteration = 0;
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
            submitFrames();
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
        submitFrames();
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
    // While examining, every frame fetches the pixel data, so the magnifier keeps up with changes.
    on(events.startExamining, function () {
        examining = true;
        requestExaminePixelData = true;
        requestFrame();
    });
    on(events.stopExamining, function () {
        examining = false;
    });

    return {
        // The image, which the display draws after each frame.
        canvas: gl.canvas,
        stop: stop,
        start: start,
        destroy: function () {
            destroyed = true;
            const lose = gl.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
        }
    };
}
