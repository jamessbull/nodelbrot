import { createFloatContext, createFramebuffer, createProgram, createTexture, fullScreenVertexShader } from "./gl.js";
import { arrayTextureWidth, colourShader, countEscapesShader, countEscapesVertexShader, deepGpuPixel, inSet, iterateShader, placePixels,
    restartSurvivorsShader } from "./shaders.js";
import { lookupTableSize } from "../worker/pixelIterator.js";
import { escapesPast, maxRereferences, nearestUnescaped, rereferenceDue } from "../rereference.js";
import { createGpuBla } from "./gpuBla.js";
import { binOf } from "../histogramBins.js";
import { inMainCardioidOrBulb } from "../mandelbrotPoint.js";
import { needsPerturbation } from "../precision.js";

// Rendering stops here. Iterations are counted exactly (see shaders.js), and the histogram, in bins past
// exactBins (see histogramBins.js), is still small enough for a texture (25 million entries).
export const gpuMaxDepth = 2 ** 28;

// The longest reference orbit the GPU is given (a quarter of a gigabyte of doubles, and half that on the
// GPU). Orbits that are complete sooner (see referenceOrbit.js) go as deep as the pixels do; rendering
// stops at the end of one that isn't.
export const gpuLongestOrbit = (2 ** 24) + 2;

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
    // The browser can take the context away (the GPU was reset, say): rendering stops, and rendererLost
    // says so, for the CPU renderer to take over. (Not when it goes because the renderer is done with.)
    gl.canvas.addEventListener("webglcontextlost", function () {
        if (!destroyed) {
            destroyed = true;
            events.fire(events.rendererLost);
        }
    });
    // Deep views (see deepGpuPixel) have a shader of their own.
    const iterateShallow = createProgram(gl, fullScreenVertexShader, iterateShader(false));
    const iterateDeep = createProgram(gl, fullScreenVertexShader, iterateShader(true));
    const count = createProgram(gl, countEscapesVertexShader, countEscapesShader);
    const colour = createProgram(gl, fullScreenVertexShader, colourShader);
    const restartSurvivors = createProgram(gl, fullScreenVertexShader, restartSurvivorsShader);
    gl.bindVertexArray(gl.createVertexArray());

    const floatTexture = () => createTexture(gl, gl.RGBA32F, width, height, gl.RGBA, gl.FLOAT);
    const uintTexture = () => createTexture(gl, gl.RGBA32UI, width, height, gl.RGBA_INTEGER, gl.UNSIGNED_INT);
    const states = [[floatTexture(), uintTexture(), uintTexture()], [floatTexture(), uintTexture(), uintTexture()]];
    const stateFramebuffers = states.map((set) => createFramebuffer(gl, set));
    const bla = createGpuBla(gl);
    let current = 0;                // which of states holds the pixels as they are
    const colourFramebuffer = createFramebuffer(gl, [createTexture(gl, gl.RGBA8, width, height, gl.RGBA, gl.UNSIGNED_BYTE)]);

    // Iterations per frame, adjusted so the GPU spends about workAim() milliseconds on each.
    const initialStepSize = 95;
    const minStepSize = 5;
    const maxStepSize = 20000;

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
    let survivorsRestartPending = false;    // or just those still going (see rereference.js)
    let viewGeneration = 0;
    let running = true;
    let frameWanted = false;
    let waitingForOrbit = false;
    let destroyed = false;
    let polling = false;
    let requestExaminePixelData = false;
    let examining = false;
    let rereferences = 0;
    let catchUpTo = 0;              // the depth the image is shown again from, after re-referencing
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

    // Uploads the reference orbit, or what is new of it, returning false if it's too long for a texture.
    // A new orbit goes in the texture the last one was in, if it fits; the texture doubles as one grows.
    function uploadOrbit() {
        const length = referenceOrbit.length();
        const values = referenceOrbit.values();
        if (orbitGeneration !== referenceOrbit.generation()) {
            orbitGeneration = referenceOrbit.generation();
            orbitUploaded = 0;
        }
        if (rowsFor(length) > orbitRows) {
            const maxRows = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (rowsFor(length) > maxRows) {
                return false;
            }
            const oldRows = orbitRows;
            orbitRows = Math.min(maxRows, Math.max(rowsFor(length), 2 * orbitRows, 8));
            const grown = createTexture(gl, gl.RG32F, arrayTextureWidth, orbitRows, gl.RG, gl.FLOAT);
            if (orbitTexture && orbitUploaded > 0) {
                // What is there already is copied over on the GPU, rather than sent again.
                const from = createFramebuffer(gl, [orbitTexture]);
                const to = createFramebuffer(gl, [grown]);
                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, from);
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to);
                gl.blitFramebuffer(0, 0, arrayTextureWidth, oldRows, 0, 0, arrayTextureWidth, oldRows, gl.COLOR_BUFFER_BIT, gl.NEAREST);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.deleteFramebuffer(from);
                gl.deleteFramebuffer(to);
            }
            if (orbitTexture) gl.deleteTexture(orbitTexture);
            orbitTexture = grown;
        }
        if (length > orbitUploaded) {
            const {firstRow, rows, data} = rowsOf(values, orbitUploaded, length, 2);
            gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, firstRow, arrayTextureWidth, rows, gl.RG, gl.FLOAT, data);
            orbitUploaded = length;
        }
        return true;
    }

    function uploadHistogram(info) {
        // The entries changed: from the bin of the first iteration the frame counted escapes for.
        const dirtyFrom = histogramArray === info.array ? binOf(info.currentIteration) : 0;
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
        stateFramebuffers.forEach(function (framebuffer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
            gl.clearBufferuiv(gl.COLOR, 1, [0, 0, 0, 0]);
            gl.clearBufferuiv(gl.COLOR, 2, [0, 0, 0, 0]);
        });
        markMainCardioidAndBulb();
        resetPending = false;
        survivorsRestartPending = false;
    }

    // Pixels in the main cardioid or the period-2 bulb are marked as in the set from the start, rather than
    // iterated to the end, as the CPU renderer does, where doubles can say which those are. Next to them
    // the pixels in the set take so long to settle into a cycle that finding one would take far longer.
    function markMainCardioidAndBulb() {
        if (needsPerturbation(view)) {
            return;
        }
        const centre = view.centre();
        const marks = new Uint32Array(width * height * 4);
        let any = false;
        for (let j = 0; j < height; j += 1) {
            const y = centre.y + ((j - ((height - 1) / 2)) * view.pixelSize);
            for (let i = 0; i < width; i += 1) {
                if (inMainCardioidOrBulb(centre.x + ((i - ((width - 1) / 2)) * view.pixelSize), y)) {
                    marks[(4 * ((j * width) + i)) + 3] = inSet;
                    any = true;
                }
            }
        }
        if (any) {
            gl.bindTexture(gl.TEXTURE_2D, states[current][1]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA_INTEGER, gl.UNSIGNED_INT, marks);
        }
    }

    function restartSurvivingPixels() {
        gl.viewport(0, 0, width, height);
        gl.useProgram(restartSurvivors.program);
        bindTexture(0, states[current][0], restartSurvivors, "state0");
        bindTexture(1, states[current][1], restartSurvivors, "state1");
        bindTexture(2, states[current][2], restartSurvivors, "state2");
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[1 - current]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        current = 1 - current;
        survivorsRestartPending = false;
    }

    function bindTexture(unit, texture, program, name) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms[name], unit);
    }

    // The iterations there is reference orbit for past the frames in flight (see interactiveRenderer.js).
    function orbitRoom() {
        return referenceOrbit.complete() ? Infinity : referenceOrbit.length() - 2 - submittedIteration;
    }

    // Frames for a view since changed don't count, so the new view's go in straight away: the GPU does
    // what is already queued first anyway, and those frames are dropped as they finish. No frame goes in
    // after one fetching data for the examine panel, which reads the pixels' state as that frame leaves it.
    function canSubmit() {
        const forThisView = framesInFlight.filter((frame) => frame.generation === viewGeneration);
        return forThisView.length < maxFramesInFlight && !forThisView.some((frame) => frame.sendsData);
    }

    // Frames go in one per animation frame, each with about half an animation frame's work, so the GPU
    // has time left to draw the page (the zoom animations, say) and the image updates as often as the
    // display does. A hidden page has no animation frames, and a window that is covered up may get none
    // either (or very few), so where none have come for a while, frames go in as fast as they can, with as
    // much work as a frame of the CPU renderer, until one comes.
    const animationFrames = typeof requestAnimationFrame === "function";
    let submitScheduled = 0;            // the pending request to put in a frame, if any
    let animationFramesStalled = false;
    let lastAnimationFrame = 0;
    let animationFrameTime = 1000 / 60; // the time between animation frames, averaged

    const paced = () => animationFrames && !document.hidden && !animationFramesStalled;
    const workAim = () => (paced() ? Math.min(26, Math.max(5, animationFrameTime / 2)) : 26);

    function scheduleSubmit() {
        if (submitScheduled || destroyed) {
            return;
        }
        const request = submitScheduled = {};
        const go = function (time) {
            if (submitScheduled === request) {
                submitScheduled = 0;
                submitNext(time);
            }
        };
        if (animationFrames && !document.hidden) {
            requestAnimationFrame(function (time) {
                animationFramesStalled = false;
                go(time);
            });
        }
        if (paced()) {
            setTimeout(function () {
                if (submitScheduled === request) {
                    animationFramesStalled = true;
                    go();
                }
            }, 50);
        } else {
            setTimeout(go, 0);
        }
    }

    function submitNext(time) {
        if (typeof time === "number" && time > lastAnimationFrame) {
            if (time - lastAnimationFrame < 100) {
                animationFrameTime = (0.9 * animationFrameTime) + (0.1 * (time - lastAnimationFrame));
            }
            lastAnimationFrame = time;
        }
        if (!destroyed && !waitingForOrbit && (running || frameWanted) && canSubmit()) {
            submitFrame();
            scheduleSubmit();
        }
        if (framesInFlight.length > 0 && !polling) {
            polling = true;
            setTimeout(poll, 1);
        }
    }

    function submitFrame() {
        if (submittedIteration >= gpuMaxDepth) {
            frameWanted = false;
            if (running) {
                events.fire(events.stop);
            }
            return;
        }
        const room = Math.min(orbitRoom(), gpuMaxDepth - submittedIteration);
        if (room < 1 && referenceOrbit.length() >= gpuLongestOrbit) {
            console.info("Rendering stopped at the end of the longest reference orbit the GPU can have, at "
                + submittedIteration.toLocaleString("en-GB") + " iterations.");
            frameWanted = false;
            if (running) {
                events.fire(events.stop);
            }
            return;
        }
        if (room < 1) {
            waitingForOrbit = true;
            referenceOrbit.want(submittedIteration + stepSize + 2);
            return;
        }
        if (!uploadOrbit()) {
            fail("the reference orbit is too long for a texture");
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
        if (resetPending) {
            clearStates();
        } else if (survivorsRestartPending) {
            restartSurvivingPixels();
        }
        gl.viewport(0, 0, width, height);

        // Iterate, from one set of state textures into the other.
        frame.timerQuery = null;
        if (gpuTimer) {
            frame.timerQuery = gl.createQuery();
            gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, frame.timerQuery);
        }
        const offset = referenceOrbit.offset();
        // The furthest any pixel is from the orbit's point, for the table of runs.
        const dcMax = Math.hypot(((width / 2) + Math.abs(offset.x)) * view.pixelSize, ((height / 2) + Math.abs(offset.y)) * view.pixelSize);
        bla.update(referenceOrbit.generation(), referenceOrbit.values(), referenceOrbit.length(), dcMax, referenceOrbit.complete());
        // A few milliseconds a frame on making a new table, if one is wanted.
        bla.work(3);
        const deep = view.pixelSize < deepGpuPixel;
        const iterate = deep ? iterateDeep : iterateShallow;
        gl.useProgram(iterate.program);
        bindTexture(0, states[current][0], iterate, "state0");
        bindTexture(1, states[current][1], iterate, "state1");
        bindTexture(2, states[current][2], iterate, "state2");
        bindTexture(3, orbitTexture, iterate, "orbit");
        bla.use(iterate, 4);
        gl.uniform1i(iterate.uniforms.orbitEnd, referenceOrbit.complete() ? referenceOrbit.length() - 1 : -1);
        gl.uniform1i(iterate.uniforms.orbitLoop, referenceOrbit.loopTo());
        gl.uniform1ui(iterate.uniforms.startIteration, frame.start);
        gl.uniform1i(iterate.uniforms.iterations, frame.iterations);
        placePixels(gl, iterate, (-((width - 1) / 2) - offset.x) * view.pixelSize, (-((height - 1) / 2) - offset.y) * view.pixelSize,
            view.pixelSize, view.pixelSize, deep);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[1 - current]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (gpuTimer) {
            gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
        }
        current = 1 - current;

        // The escapes, counted by iteration, copied back.
        const rows = Math.ceil(frame.iterations / arrayTextureWidth);
        gl.useProgram(count.program);
        bindTexture(0, states[current][1], count, "state1");
        gl.uniform1i(count.uniforms.stateWidth, width);
        gl.uniform1ui(count.uniforms.startIteration, frame.start);
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
        scheduleSubmit();
        if (framesInFlight.length > 0 && !polling) {
            polling = true;
            setTimeout(poll, 1);
        }
    }

    function finishFrame(frame) {
        const work = workTime(frame);
        // Frames from before the view changed are dropped.
        if (frame.generation !== viewGeneration) {
            return;
        }
        // Chrome (152) warns that this is read the slow way, not from the copy it made ahead of time,
        // whatever is done (see dev/readbackCheck.html); the counts are small, so that costs little.
        gl.bindBuffer(gl.COPY_READ_BUFFER, frame.countsBuffer);
        gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, counts, 0, arrayTextureWidth * Math.ceil(frame.iterations / arrayTextureWidth) * 4);
        gl.bindBuffer(gl.COPY_READ_BUFFER, null);
        const update = new Uint32Array(frame.iterations);
        for (let n = 0; n < frame.iterations; n += 1) {
            update[n] = counts[4 * n];
        }
        const escapes = escapesPast(update, frame.start, catchUpTo);
        if (escapes) {
            events.fire(events.escapesFromWorkers, escapes);
        }
        events.fire(events.depthReached, Math.max(frame.start, catchUpTo));
        currentIteration = frame.start + frame.iterations;
        // After re-referencing, the image isn't shown again until it has caught up (see rereference.js).
        const showing = currentIteration >= catchUpTo;
        if (showing || frame.sendsData) {
            drawImage();
        }
        if (frame.sendsData) {
            readExamineData();
            events.fire(events.pixelDataReady);
        }
        if (showing) {
            events.fire(events.frameComplete);
        }
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
        bindTexture(1, states[current][2], colour, "state2");
        bindTexture(2, histogramTexture, colour, "histogram");
        bindTexture(3, paletteTexture, colour, "palette");
        gl.uniform1ui(colour.uniforms.depth, shownDepth());
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

    // The depth the image is of: the frames finished, or while catching up after re-referencing, the depth
    // reached before.
    const shownDepth = () => Math.max(currentIteration, catchUpTo);

    // Each pixel's escape iteration (or 0), as of the frames finished, waiting for the GPU. Only the
    // examine panel and re-referencing need them, so they aren't copied back every frame.
    function readEscapeValues() {
        const state1 = readState(1);
        for (let idx = 0; idx < width * height; idx += 1) {
            const at = state1[(idx * 4) + 2];
            escapeValues[idx] = at <= shownDepth() ? at : 0;
        }
        return state1;
    }

    // One of the state textures as the frames finished left it (see shaders.js), state0 as floats and
    // the others as unsigned integers.
    function readState(which) {
        const state = which === 0 ? new Float32Array(width * height * 4) : new Uint32Array(width * height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stateFramebuffers[current]);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + which);
        if (which === 0) {
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, state);
        } else {
            gl.readPixels(0, 0, width, height, gl.RGBA_INTEGER, gl.UNSIGNED_INT, state);
        }
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        return state;
    }

    // Each pixel's colour, escape iteration, z and image escape iteration, for the examine panel. Frames
    // don't go in while one fetching these is out, so the pixels are as that frame left them.
    function readExamineData() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, colourFramebuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
        const orbit = referenceOrbit.values();
        const state0 = readState(0);
        const state1 = readEscapeValues();
        const state2 = readState(2);
        for (let idx = 0; idx < width * height; idx += 1) {
            const at = state1[(idx * 4) + 3];
            imageEscapeValues[idx] = at === inSet ? 0 : at;
            // z = Z + d, d being a mantissa times 2^power deep in (see shaders.js).
            const m = state1[idx * 4];
            const scale = 2 ** (state2[(idx * 4) + 2] | 0);
            xState[idx] = orbit[2 * m] + (state0[idx * 4] * scale);
            yState[idx] = orbit[(2 * m) + 1] + (state0[(idx * 4) + 1] * scale);
        }
    }

    // Scales the step size the frame went in with (frames that came after it may have changed it since)
    // towards the aim, by at most a factor of two so one odd frame can't swing it too far. Frames cut
    // short by the reference orbit are counted as if they had been the full size.
    function updateStepSize(frame, work) {
        const fullWork = work * frame.stepSize / frame.iterations;
        const aim = workAim();
        if (fullWork >= 0.85 * aim && fullWork <= 1.15 * aim) {
            return;
        }
        const scale = Math.min(2, Math.max(0.5, aim / Math.max(fullWork, 0.1)));
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
        scheduleSubmit();
    }

    // Starts the view again: every pixel, or (keepEscaped) just those still going.
    function restartView(keepEscaped) {
        viewGeneration += 1;
        currentIteration = 0;
        submittedIteration = 0;
        stepSize = initialStepSize;
        if (keepEscaped) {
            survivorsRestartPending = true;
        } else {
            resetPending = true;
        }
    }

    on(events.viewChanged, function (newView) {
        if (!referenceOrbit.active()) {
            throw new Error("The GPU renderer needs a reference orbit for every view");
        }
        view = newView;
        rereferences = 0;
        catchUpTo = 0;
        restartView(false);
    });

    on(events.referenceChanged, function () {
        catchUpTo = Math.max(catchUpTo, currentIteration);
        restartView(true);
    });

    on(events.referenceOrbitGrew, function () {
        if (waitingForOrbit && orbitRoom() >= 1) {
            waitingForOrbit = false;
            scheduleSubmit();
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
        scheduleSubmit();
    }

    function stop() {
        running = false;
    }

    on(events.start, start);
    on(events.restart, start);
    on(events.stop, stop);
    // A change while stopped (to the colours, say) shows by colouring the pixels again, without iterating
    // them further: frames still in flight show it anyway. Only pixels yet to be iterated at all need a
    // frame.
    on(events.showChanges, function () {
        if (running || framesInFlight.length > 0) {
            return;
        }
        if (resetPending) {
            requestFrame();
            return;
        }
        drawImage();
        if (examining) {
            readExamineData();
            events.fire(events.pixelDataReady);
        }
        events.fire(events.frameComplete);
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
