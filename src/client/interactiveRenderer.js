import { createWorkerPool } from "./workerPool.js";
import { createStopwatch } from "./stopWatch.js";
import { renderFragments, interactiveMessage } from "./messages/messages.js";
import { initialHistogramSize } from "./mandelbrotEscape.js";

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
    let running = true;
    let stopped = false;
    let destroyed = false;      // once destroyed, nothing more is sent to the workers
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
            if(requestExaminePixelData) {
                _events.fire(_events.publishPixelState);
            }
            requestExaminePixelData = false;
            _events.fire(_events.renderImage, {imgData: _imgData, offset: 0});
            _events.fire(_events.andFinally);
            _events.fire(_events.frameComplete);

            updateStepSize(timer.elapsed());
        }

        if(running) {
            postMessage();
        } else {
            stopped = true;
        }
    }

    // Stops rendering, rather than retrying something that may fail every frame. Go starts it again.
    function onWorkerError(message) {
        console.error("Rendering stopped: a worker failed: " + message);
        stopped = true;
        _events.fire(_events.stop);
    }

    function postMessage() {
        if (destroyed) {
            return;
        }
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

            if (requestExaminePixelData) {
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
        extents = extentsTransfer(_extents.topLeft().x, _extents.topLeft().y, _extents.width(), _extents.height());
        palette = undefined;
    });

    on(_events.histogramUpdated, function (info) {
        histogram = info.array;
        histogramFilledLength = info.filledLength;
        histogramTotal = info.total;
    });

    on(_events.start, function () {
        if (running === false) {
            running = true;
            stopped = false;
            postMessage();
        }
    });

    on(_events.stop, function () {
        if(running === true) {
            running = false;
        }
    });

    function isStopped() {
        if (destroyed) {
            return;
        }
        if (stopped) {
            running = true;
            stopped = false;
            postMessage();
        } else {
            setTimeout(isStopped,10);
        }
    }

    on(_events.pulseUI, function () {
        if(running === false) {
            stopped = false;
            postMessage();
        }
    });

    on(_events.restart, function () {
        if(!running) {
            setTimeout(isStopped, 10);
        }
    });

    on(_events.examinePixelState, function () {
        requestExaminePixelData = true;
        stopped = false;
        postMessage();
    });

    return {
        stop: function () {
            running = false;
            stopped = false;
        },
        start: function () {
            running = true;
            stopped = false;
            postMessage();
        },
        destroy: function () {
            destroyed = true;
            pool.terminate();
        }
    };
}
