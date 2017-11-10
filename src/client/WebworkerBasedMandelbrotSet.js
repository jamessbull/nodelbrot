namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize, _parallelism, _imgData, _escapeValues, _xState, _yState, _imageEscapeValues, _extents) {
    "use strict";

    var pool = jim.worker.pool.create(_parallelism, "/js/combinedWorker.js", [], "none", "histogramDataBuffer");
    var array = jim.common.array;
    var requestExaminePixelData = false;
    var copyOfHisto = new Uint32Array(250000);
    var histogramTotal = 0;
    var stepSize = _stepSize;
    var currentIteration = 0;
    var extents = _extents;
    var palette = null;
    var escapeValues = _escapeValues;
    var running = true;
    var stopped = false;
    var fragments;

    function onEachJob(_msg) {
        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(_msg.histogramUpdate), currentIteration: currentIteration});
        escapeValues.set(new Uint32Array(_msg.escapeValues), (_msg.offset / 4));
        _imgData.set(new Uint8ClampedArray(_msg.imageDataBuffer), _msg.offset);
        if (_msg.extraDataSent) {
            _xState.set(new Uint32Array(_msg.xState), (_msg.offset / 4));
            _yState.set(new Uint32Array(_msg.yState), (_msg.offset / 4));
            _imageEscapeValues.set(new Uint32Array(_msg.imageEscapeValues), (_msg.offset / 4));
        }
    }

    function onAllJobsComplete() {
        _events.fire(_events.maxIterationsUpdated, currentIteration);
        currentIteration += stepSize;
        if(requestExaminePixelData) {
            _events.fire(_events.publishPixelState);
        }
        requestExaminePixelData = false;
        _events.fire(_events.renderImage, {imgData: _imgData, offset: 0});
        _events.fire(_events.andFinally);
        _events.fire(_events.frameComplete);
        if(running) {
            postMessage();
        } else {
            stopped = true;
        }
        palette = undefined;
        extents = undefined;
    }

    function postMessage() {
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
            var job = jim.messages.interactive.create(message, copyOfHisto, currentIteration, stepSize, palette, histogramTotal);

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
    });

    on(_events.extentsUpdate, function (_extents) {
        copyOfHisto = new Uint32Array(250000);
        currentIteration = 0;
        extents = extentsTransfer(_extents.topLeft().x, _extents.topLeft().y, _extents.width(), _extents.height());
        palette = undefined;
    });

    on(_events.histogramUpdated, function (info) {
        copyOfHisto = info.array;
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