namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize, _parallelism, imgData) {
    "use strict";

    var pool = jim.worker.pool.create(_parallelism, "/js/combinedWorker.js", [], "none", "histogramDataBuffer");
    var array = jim.common.array;

    var escapeValuesRequested = false;
    var copyOfHisto = new Uint32Array(250000);
    var histogramTotal = 0;
    var stepSize = _stepSize;
    var currentIteration = 0;
    var extents = null;
    var palette = null;
    var escapeValues = new Uint32Array(_width * _height);
    var running = true;

    function onEachJob(_msg) {
        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(_msg.histogramUpdate), currentIteration: currentIteration});
        escapeValues.set(new Uint32Array(_msg.escapeValues), (_msg.offset / 4));
        imgData.set(new Uint8ClampedArray(_msg.imageDataBuffer), _msg.offset);
    }

    function onAllJobsComplete() {
        _events.fire(_events.maxIterationsUpdated, currentIteration);
        currentIteration += stepSize;

        if (escapeValuesRequested) {
            escapeValuesRequested = false;
            _events.fire(_events.escapeValuesPublished, escapeValues);
        }

        _events.fire(_events.renderImage, {imgData: imgData, offset: 0});
        _events.fire(_events.andFinally);
        _events.fire(_events.frameComplete);


        if(running) postMessage();
        palette = undefined;
        extents = undefined;
    }

    function postMessage() {
        var mx = extents ? extents.mx : undefined;
        var my = extents ? extents.my : undefined;
        var mw = extents ? extents.mw : undefined;
        var mh = extents ? extents.mh : undefined;
        var initialRenderDefinition = jim.messages.renderFragment.create(0, mx, my, mw, mh, _width, _height);

        var fragments = initialRenderDefinition.split(_parallelism);
        if(palette !== undefined) {
            console.log("palette does not equal null");
        }
        var jobs = array(fragments.length, function (i) {
            return jim.messages.interactive.create(fragments[i].asMessage(), copyOfHisto, currentIteration, stepSize, palette, histogramTotal);
        });

        pool.consume(jobs, onEachJob, onAllJobsComplete);
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    on(_events.requestEscapeValues, function () {
        escapeValuesRequested = true;
    });

    on(_events.paletteChanged, function (_palette) {
        console.log("palette updated");
        if (_palette === null || _palette === undefined) {
            console.log("Palette being set with an undefined value");
        }
        palette = _palette.toNodeList();
    });

    on(_events.extentsUpdate, function (_extents) {
        copyOfHisto = new Uint32Array(250000);
        currentIteration = 0;
        extents = extentsTransfer(_extents.topLeft().x, _extents.topLeft().y, _extents.width(), _extents.height());
        console.log("Calling post from extents update");
        postMessage();
        palette = undefined;
        extents = undefined;
    });

    on(_events.histogramUpdated, function (info) {
        copyOfHisto = info.array;
        histogramTotal = info.total;
    });

    on(_events.examinePixelState, function () {
        //create jobs
        var noOfPixels = _width * _height;

        var jobs = [];
        for (var i = 0 ; i < _parallelism; i+=1) {
            jobs[i] = {sendData: true, offset: noOfPixels / _parallelism};
        }
        // data in msg will be copies
        var imgData = new Uint8ClampedArray(noOfPixels * 4);
        var xState = new Float64Array(noOfPixels);
        var yState = new Float64Array(noOfPixels);
        var imageEscapeValues = new Uint32Array(noOfPixels);

        function collectData (_msg) {
            for (var j = 0 ; j < _msg.xState.length ; j +=1) {
                xState[_msg.offset + j] = _msg.xState[j];
                yState[_msg.offset + j] = _msg.yState[j];
                escapeValues[_msg.offset + j] = _msg.escapeValues[j];
                imageEscapeValues[_msg.offset + j] = _msg.imageEscapeValues[j];
                for (var z = 0 ; z < 4 ; z +=1) {
                    imgData[((_msg.offset + j) * 4) + z] = _msg.imgData[(j * 4) + z];
                }
            }
        }

        function publishData () {
            _events.fire(_events.publishPixelState, {imgData: imgData, xState: xState, yState: yState, escapeValues: escapeValues, imageEscapeValues: imageEscapeValues});
        }
        pool.consume(jobs, collectData, publishData);
    });

    return {
        stop: function () {
            running = false;
        },
        start: function () {
            running = true;
            postMessage();
        },
        destroy: function () {
            pool.terminate();
        }, escapeValues: function () {return escapeValues;}
    };
};