import { createWorkerPool } from "./workerPool.js";
import { createStopwatch } from "./stopwatch.js";
import { renderFragments, interactiveMessage } from "./workerMessages.js";
import { initialHistogramSize } from "./escapeHistogram.js";

// Renders the interactive view with a pool of workers, a frame at a time, into the buffers it is given
// (each a value or four per pixel of the width x height display): imgData, the image; escapeValues, the
// iteration each pixel escaped at; and, when examining pixels, xState, yState and imageEscapeValues.
// workers is how many workers to use, made by newWorker(); stopwatch times frames (for tests to fake).
export function createInteractiveRenderer({width: _width, height: _height, events: _events, workers: _parallelism, newWorker,
        imgData: _imgData, escapeValues: _escapeValues, xState: _xState, yState: _yState, imageEscapeValues: _imageEscapeValues,
        stopwatch = createStopwatch()}) {
    const on = _events.listenTo;
    const pool = createWorkerPool(_parallelism, newWorker);
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
    let palette = null;         // palette nodes to send with the next batch, if they've changed
    let paletteBlend = "rgb";
    const escapeValues = _escapeValues;
    // Rendering goes a batch (a frame) at a time, with at most one batch out with the workers.
    let running = true;         // whether to carry on with another frame after each one
    let inFlight = false;       // whether a batch is out with the workers
    let frameWanted = false;    // whether one more frame has been asked for, even if not running
    let destroyed = false;      // once destroyed, nothing more is sent to the workers
    let batchSendsData = false; // whether the batch out asked for the examine data
    let fragments;
    const timer = stopwatch;
    // Bumped whenever the view changes. A batch posted before then is for the old view, so its
    // results are discarded instead of being mixed into the new view's state.
    let viewGeneration = 0;
    let batchGeneration = 0;

    // Copies a fragment's rows, which arrive one after another in source, to their places in target,
    // which has valuesPerPixel values for each pixel of the whole image.
    function placeRows(target, source, _msg, valuesPerPixel) {
        const rowLength = _width * valuesPerPixel;
        for (let k = 0, row = _msg.firstRow; (k * rowLength) < source.length; k += 1, row += _msg.rowStride) {
            target.set(source.subarray(k * rowLength, (k + 1) * rowLength), row * rowLength);
        }
    }

    function onEachJob(_msg) {
        if (batchGeneration !== viewGeneration) {
            return;
        }
        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(_msg.histogramUpdate), currentIteration: currentIteration});
        placeRows(escapeValues, new Uint32Array(_msg.escapeValues), _msg, 1);
        placeRows(_imgData, new Uint8ClampedArray(_msg.imageDataBuffer), _msg, 4);
        if (_msg.extraDataSent) {
            placeRows(_xState, _msg.xState, _msg, 1);
            placeRows(_yState, _msg.yState, _msg, 1);
            placeRows(_imageEscapeValues, _msg.imageEscapeValues, _msg, 1);
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
            _events.fire(_events.maxIterationsUpdated, currentIteration);
            currentIteration += stepSize;
            if (batchSendsData) {
                _events.fire(_events.publishPixelState);
            }
            _events.fire(_events.renderImage, {imgData: _imgData, offset: 0});
            _events.fire(_events.andFinally);
            _events.fire(_events.frameComplete);

            updateStepSize(timer.elapsed());
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
        _events.fire(_events.stop);
    }

    // Sends the next batch now, or once the one out with the workers is done.
    function requestFrame() {
        if (inFlight) {
            frameWanted = true;
        } else {
            postMessage();
        }
    }

    function postMessage() {
        if (destroyed) {
            return;
        }
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
        const initialRenderDefinition = renderFragments(mx, my, mw, mh, _width, _height);

        if(extents) {
            // Every worker gets every _parallelism-th row, so each has a fair share of the costly pixels.
            fragments = initialRenderDefinition.interleave(_parallelism);
        }

        const jobs = fragments.map(function (message, i) {
            if (!extents) {
                message.extents = undefined;
            }
            const job = interactiveMessage(message, histogram, currentIteration, stepSize, palette, histogramTotal, histogramFilledLength);
            if (palette) {
                job.paletteBlend = paletteBlend;
            }
            // The worker keeps the per-pixel state of its fragment between frames.
            job.workerIndex = i % _parallelism;

            if (batchSendsData) {
                job.sendData = true;
            }
            return job;
        });
        // A new view or palette only needs sending once, so clear them now they have gone. (Only here:
        // a batch can finish after a view change without sending it, and the view mustn't be lost.)
        extents = undefined;
        palette = undefined;
        pool.consume(jobs, onEachJob, onAllJobsComplete, onWorkerError);
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    on(_events.paletteChanged, function (_palette) {
        palette = _palette.toNodeList();
        paletteBlend = _palette.blend();
    });

    on(_events.extentsUpdate, function (_extents) {
        viewGeneration += 1;
        histogram = new Uint32Array(initialHistogramSize);
        histogramFilledLength = 0;
        currentIteration = 0;
        stepSize = initialStepSize;
        // A palette waiting to be sent is kept: the new view needs it as much as the old one did.
        extents = extentsTransfer(_extents.topLeft().x, _extents.topLeft().y, _extents.width(), _extents.height());
    });

    on(_events.histogramUpdated, function (info) {
        histogram = info.array;
        histogramFilledLength = info.filledLength;
        histogramTotal = info.total;
    });

    // Carries on rendering: now, or after the batch out with the workers, which a stop before then cancels.
    function start() {
        running = true;
        if (!inFlight) {
            postMessage();
        }
    }

    function stop() {
        running = false;
    }

    on(_events.start, start);
    on(_events.restart, start);
    on(_events.stop, stop);

    // One more frame while stopped, so a change (such as to the colours) shows.
    on(_events.pulseUI, function () {
        if (!running) {
            requestFrame();
        }
    });

    on(_events.examinePixelState, function () {
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
