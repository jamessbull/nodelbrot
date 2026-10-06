namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize, _parallelism, _imgData, _escapeValues, _xState, _yState, _imageEscapeValues, _extents) {
    "use strict";

    var pool = jim.worker.pool.create(_parallelism, jim.worker.url, [], "none", "histogramDataBuffer");
    var array = jim.common.array;
    var requestExaminePixelData = false;
    var histogram = new Uint32Array(jim.mandelbrot.initialHistogramSize);
    var histogramFilledLength = 0;
    var histogramTotal = 0;
    // Iterations per frame. Adjusted after each frame to keep the workers' time per frame between
    // 30 and 42ms, and reset when the view changes, since a new view starts with every pixel active.
    var initialStepSize = 95;
    var minStepSize = 5;
    var maxStepSize = 20000;
    var stepSize = initialStepSize;
    var currentIteration = 0;
    var extents = _extents;
    var palette = null;         // palette nodes to send with the next batch, if they've changed
    var paletteBlend = "rgb";
    var escapeValues = _escapeValues;
    var running = true;
    var stopped = false;
    var fragments;
    var timer = jim.stopwatch.create();
    // Bumped whenever the view changes. A batch posted before then is for the old view, so its
    // results are discarded instead of being mixed into the new view's state.
    var viewGeneration = 0;
    var batchGeneration = 0;

    function onEachJob(_msg) {
        if (batchGeneration !== viewGeneration) {
            return;
        }
        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(_msg.histogramUpdate), currentIteration: currentIteration});
        escapeValues.set(new Uint32Array(_msg.escapeValues), (_msg.offset / 4));
        _imgData.set(new Uint8ClampedArray(_msg.imageDataBuffer), _msg.offset);
        if (_msg.extraDataSent) {
            _xState.set(_msg.xState, (_msg.offset / 4));
            _yState.set(_msg.yState, (_msg.offset / 4));
            _imageEscapeValues.set(_msg.imageEscapeValues, (_msg.offset / 4));
        }
    }

    function updateStepSize (elapsed) {
        if (elapsed >= 30 && elapsed <= 42) {
            return;
        }
        // Scale towards 36ms, by at most a factor of two so one odd frame can't swing it too far.
        var scale = Math.min(2, Math.max(0.5, 36 / Math.max(elapsed, 1)));
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
        palette = undefined;
        extents = undefined;
    }

    function postMessage() {
        timer.start();
        batchGeneration = viewGeneration;
        var mx = extents ? extents.mx : undefined;
        var my = extents ? extents.my : undefined;
        var mw = extents ? extents.mw : undefined;
        var mh = extents ? extents.mh : undefined;
        var initialRenderDefinition = jim.messages.renderFragment2.create(0, mx, my, mw, mh, _width, _height);

        if(extents) {
            fragments = initialRenderDefinition.split(_parallelism);
        }

        var jobs = array(fragments.length, function (i) {
            var message = fragments[i];
            if (!extents) {
                message.extents = undefined;
            }
            var job = jim.messages.interactive.create(message, histogram, currentIteration, stepSize, palette, histogramTotal, histogramFilledLength);
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
        extents = undefined;
        pool.consume(jobs, onEachJob, onAllJobsComplete);
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    on(_events.paletteChanged, function (_palette) {
        if (_palette === null || _palette === undefined) {
        }
        palette = _palette.toNodeList();
        paletteBlend = _palette.blend();
    });

    on(_events.extentsUpdate, function (_extents) {
        viewGeneration += 1;
        histogram = new Uint32Array(jim.mandelbrot.initialHistogramSize);
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
            pool.terminate();
        }, escapeValues: function () {return escapeValues;}
    };
};