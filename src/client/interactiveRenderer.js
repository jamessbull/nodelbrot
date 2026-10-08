import { createWorkerPool } from "./workerPool.js";
import { createStopwatch } from "./stopwatch.js";
import { renderFragments, interactiveMessage } from "./workerMessages.js";
import { initialHistogramSize } from "./escapeHistogram.js";
import { escapesPast, maxRereferences, nearestUnescaped, rereferenceDue } from "./rereference.js";

// Renders the interactive view with a pool of workers, a frame at a time, into the buffers it is given
// (each a value or four per pixel of the width x height display): imgData, the image; escapeValues, the
// iteration each pixel escaped at; and, when examining pixels, xState, yState and imageEscapeValues.
// workers is how many workers to use, made by newWorker(); stopwatch times frames (for tests to fake).
//
// Views too deep for doubles are rendered by perturbation, from referenceOrbit (see referenceOrbit.js),
// when it is active for the view: its chunks are passed on to the workers, frames never take pixels past
// the end of the orbit worked out so far (waiting for more if need be), and if the orbit escapes and
// pixels are still going long after, it starts again from one of those pixels, up to maxRereferences
// times a view.
export function createInteractiveRenderer({width, height, events, workers, newWorker, imgData, escapeValues, xState, yState,
        imageEscapeValues, stopwatch = createStopwatch(), referenceOrbit = null}) {
    const on = events.listenTo;
    const pool = createWorkerPool(workers, newWorker);
    let requestExaminePixelData = false;
    let histogram = new Uint32Array(initialHistogramSize);
    let histogramFilledLength = 0;
    let histogramTotal = 0;
    // Iterations per frame. Adjusted after each frame to keep the workers' time per frame between
    // 30 and 42ms, and reset when the view changes, since a new view starts with every pixel active.
    const initialStepSize = 95;
    const minStepSize = 5;
    const maxStepSize = 20000;
    let stepSize = initialStepSize;
    let currentIteration = 0;
    let extents;                // the view to send with the next batch, if it has changed
    let keepEscaped = false;    // whether the workers keep the pixels that have escaped, with extents
    let palette = null;         // palette nodes to send with the next batch, if they've changed
    let paletteBlend = "rgb";
    // Rendering goes a batch (a frame) at a time, with at most one batch out with the workers.
    let running = true;         // whether to carry on with another frame after each one
    let inFlight = false;       // whether a batch is out with the workers
    let frameWanted = false;    // whether one more frame has been asked for, even if not running
    let recolourOnly = false;   // whether that frame is only to colour the pixels again, not iterate them
    let destroyed = false;      // once destroyed, nothing more is sent to the workers
    let batchSendsData = false; // whether the batch out asked for the examine data
    let fragments;
    let view = null;            // the view being rendered
    let perturbing = false;     // whether it is rendered by perturbation
    let waitingForOrbit = false;
    let rereferences = 0;
    let catchUpTo = 0;          // the depth the image is shown again from, after re-referencing (see rereference.js)
    let frameIterations = 0;    // the iterations the batch out with the workers is doing
    const timer = stopwatch;
    // Bumped whenever the view changes. A batch posted before then is for the old view, so its
    // results are discarded instead of being mixed into the new view's state.
    let viewGeneration = 0;
    let batchGeneration = 0;

    // Copies a fragment's rows, which arrive one after another in source, to their places in target,
    // which has valuesPerPixel values for each pixel of the whole image.
    function placeRows(target, source, msg, valuesPerPixel) {
        const rowLength = width * valuesPerPixel;
        for (let k = 0, row = msg.firstRow; (k * rowLength) < source.length; k += 1, row += msg.rowStride) {
            target.set(source.subarray(k * rowLength, (k + 1) * rowLength), row * rowLength);
        }
    }

    function onEachJob(msg) {
        if (batchGeneration !== viewGeneration) {
            return;
        }
        const escapes = escapesPast(new Uint32Array(msg.histogramUpdate), currentIteration, catchUpTo);
        if (escapes && escapes.update.length > 0) {
            events.fire(events.escapesFromWorkers, escapes);
        }
        placeRows(escapeValues, new Uint32Array(msg.escapeValues), msg, 1);
        placeRows(imgData, new Uint8ClampedArray(msg.imageDataBuffer), msg, 4);
        if (msg.extraDataSent) {
            placeRows(xState, msg.xState, msg, 1);
            placeRows(yState, msg.yState, msg, 1);
            placeRows(imageEscapeValues, msg.imageEscapeValues, msg, 1);
        }
    }

    function updateStepSize (elapsed) {
        if (elapsed >= 30 && elapsed <= 42) {
            return;
        }
        // Scale towards 36ms, by at most a factor of two so one odd frame can't swing it too far.
        const scale = Math.min(2, Math.max(0.5, 36 / Math.max(elapsed, 1)));
        stepSize = Math.min(maxStepSize, Math.max(minStepSize, Math.round(stepSize * scale)));
    }

    function onAllJobsComplete() {
        timer.stop();
        if (batchGeneration === viewGeneration) {
            events.fire(events.depthReached, Math.max(currentIteration, catchUpTo));
            currentIteration += frameIterations;
            if (batchSendsData) {
                events.fire(events.pixelDataReady);
            }
            if (currentIteration >= catchUpTo) {
                events.fire(events.frameComplete);
            }

            // A frame that only coloured the pixels again says nothing about how long iterations take.
            if (frameIterations > 0) {
                updateStepSize(timer.elapsed());
            }
            rereferenceIfNeeded();
        }

        inFlight = false;
        if (running || frameWanted) {
            postMessage();
        }
    }

    // Stops rendering, rather than retrying something that may fail every frame. Go starts it again.
    function onWorkerError(message) {
        console.error("Rendering stopped: a worker failed: " + message);
        inFlight = false;
        frameWanted = false;
        events.fire(events.stop);
    }

    // Sends the next batch now, or once the one out with the workers is done.
    function requestFrame() {
        if (inFlight || waitingForOrbit) {
            frameWanted = true;
        } else {
            postMessage();
        }
    }

    // The iterations there is reference orbit for, after the depth reached, if rendering by perturbation:
    // pixels can get up to two values from the end of an orbit still being worked out.
    function orbitRoom() {
        if (!perturbing || referenceOrbit.complete()) {
            return Infinity;
        }
        return referenceOrbit.length() - 2 - currentIteration;
    }

    // See rereference.js.
    function rereferenceIfNeeded() {
        if (!perturbing || !running || rereferences >= maxRereferences || !rereferenceDue(referenceOrbit, currentIteration)) {
            return;
        }
        const nearest = nearestUnescaped(escapeValues, width, height);
        if (nearest) {
            rereferences += 1;
            referenceOrbit.rereference(nearest.dx, nearest.dy);
        }
    }

    function postMessage() {
        if (destroyed) {
            return;
        }
        const recolouring = recolourOnly && !running;
        recolourOnly = false;
        const room = recolouring ? 0 : orbitRoom();
        if (!recolouring && room < 1) {
            waitingForOrbit = true;
            referenceOrbit.want(currentIteration + stepSize + 2);
            return;
        }
        frameIterations = recolouring ? 0 : Math.min(stepSize, room);
        inFlight = true;
        frameWanted = false;
        batchSendsData = requestExaminePixelData;
        requestExaminePixelData = false;
        timer.start();
        batchGeneration = viewGeneration;
        const mx = extents ? extents.mx : undefined;
        const my = extents ? extents.my : undefined;
        const mw = extents ? extents.mw : undefined;
        const mh = extents ? extents.mh : undefined;
        const initialRenderDefinition = renderFragments(mx, my, mw, mh, width, height);

        if(extents) {
            // Every worker gets every workers-th row, so each has a fair share of the costly pixels.
            fragments = initialRenderDefinition.interleave(workers);
        }

        const jobs = fragments.map(function (message, i) {
            if (!extents) {
                message.extents = undefined;
            }
            const job = interactiveMessage(message, histogram, currentIteration, frameIterations, palette, histogramTotal, histogramFilledLength);
            job.perturbation = perturbing;
            job.keepEscaped = keepEscaped;
            if (palette) {
                job.paletteBlend = paletteBlend;
            }
            // The worker keeps the per-pixel state of its fragment between frames.
            job.workerIndex = i % workers;

            if (batchSendsData) {
                job.sendData = true;
            }
            return job;
        });
        // A new view or palette only needs sending once, so clear them now they have gone. (Only here:
        // a batch can finish after a view change without sending it, and the view mustn't be lost.)
        extents = undefined;
        keepEscaped = false;
        palette = undefined;
        pool.consume(jobs, onEachJob, onAllJobsComplete, onWorkerError);
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    on(events.paletteChanged, function (newPalette) {
        palette = newPalette.toNodeList();
        paletteBlend = newPalette.blend();
    });

    // Starts rendering the view again from the beginning: pixels' positions (extents) are sent with the
    // next batch. By perturbation, they are the differences dc from the reference orbit's point.
    // With keepEscaped, only the pixels still going start again, and the histogram is kept (see
    // rereference.js).
    function restartView(keepEscapedPixels) {
        viewGeneration += 1;
        keepEscaped = keepEscapedPixels;
        if (!keepEscapedPixels) {
            histogram = new Uint32Array(initialHistogramSize);
            histogramFilledLength = 0;
        }
        currentIteration = 0;
        stepSize = initialStepSize;
        // A palette waiting to be sent is kept: the new view needs it as much as the old one did.
        if (perturbing) {
            const offset = referenceOrbit.offset();
            const pixelSize = view.pixelSize;
            extents = extentsTransfer((-((width - 1) / 2) - offset.x) * pixelSize, (-((height - 1) / 2) - offset.y) * pixelSize,
                (width - 1) * pixelSize, (height - 1) * pixelSize);
        } else {
            const area = view.area(width, height);
            extents = extentsTransfer(area.topLeft().x, area.topLeft().y, area.width(), area.height());
        }
    }

    // The view (see view.js), or anything else with an area(width, height) rectangle, as the render check
    // gives it.
    on(events.viewChanged, function (newView) {
        view = newView;
        perturbing = Boolean(referenceOrbit && referenceOrbit.active());
        rereferences = 0;
        catchUpTo = 0;
        restartView(false);
    });

    on(events.referenceChanged, function () {
        catchUpTo = Math.max(catchUpTo, currentIteration);
        restartView(true);
    });

    // Each worker keeps its own copy of the reference orbit.
    function sendOrbit(generation, from, values, complete, loopTo) {
        pool.sendToEach(() => ({workerMessageType: "uiworker", orbit: {generation, from, values, complete, loopTo}}));
    }

    on(events.referenceOrbitGrew, function (chunk) {
        sendOrbit(chunk.generation, chunk.from, chunk.values, chunk.complete, chunk.loopTo);
        if (waitingForOrbit && orbitRoom() >= 1) {
            waitingForOrbit = false;
            if (running || frameWanted) {
                postMessage();
            }
        }
    });

    // A display made again (at a new size) carries on with the orbit there is.
    if (referenceOrbit && referenceOrbit.active() && referenceOrbit.length() > 0) {
        sendOrbit(referenceOrbit.generation(), 0, referenceOrbit.values().slice(), referenceOrbit.complete(), referenceOrbit.loopTo());
    }

    on(events.histogramChanged, function (info) {
        histogram = info.array;
        histogramFilledLength = info.filledLength;
        histogramTotal = info.total;
    });

    // Carries on rendering: now, or after the batch out with the workers, which a stop before then cancels.
    function start() {
        running = true;
        if (!inFlight && !waitingForOrbit) {
            postMessage();
        }
    }

    function stop() {
        running = false;
    }

    on(events.start, start);
    on(events.restart, start);
    on(events.stop, stop);

    // One more frame while stopped, so a change (such as to the colours) shows: of no iterations, so the
    // workers just colour the pixels again, unless the view has yet to be sent to them.
    on(events.showChanges, function () {
        if (!running) {
            recolourOnly = !extents;
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
            pool.terminate();
        }
    };
}
