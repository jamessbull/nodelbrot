namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize, _parallelism) {
    "use strict";

    var pool = jim.worker.pool.create(_parallelism, "/js/combinedWorker.js", [], "none", "histogramDataBuffer");

    function onEachJob(_msg) {
        jobDone(_msg);
    }
    function onAllJobsComplete() {

    }

    //var worker = new Worker("/js/combinedWorker.js");
    var shouldPublishEscapeValues = false;
    var copyOfHisto = new Uint32Array(250000);
    var histogramTotal = 0;
    var stepSize = _stepSize;
    var currentIteration = 0;
    var extents = null;
    var palette = null;
    var additionalMessagesInFlight = 0;
    var escapeValues;

    function postMessage() {
        additionalMessagesInFlight +=1;
        var msg = {
            offset: 0,
            exportWidth :_width,
            exportHeight :_height,
            histogramDataBuffer: copyOfHisto.buffer,
            currentIteration : currentIteration,
            iterations : stepSize,
            extents: extents,
            paletteNodes: palette,
            histogramTotal : histogramTotal
        };

        pool.consume([msg], onEachJob, onAllJobsComplete);
        //worker.postMessage(msg, [copyOfHisto.buffer]);
    }

    var running = true;

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    function jobDone (m) {
        var msg = m;
        additionalMessagesInFlight-=1;
        if(additionalMessagesInFlight >0) return;

        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(msg.histogramUpdate), currentIteration: currentIteration});
        _events.fire(_events.maxIterationsUpdated, currentIteration);
        if (shouldPublishEscapeValues) {
            _events.fire(_events.escapeValuesPublished, new Uint32Array(msg.escapeValues));
            shouldPublishEscapeValues = false;
        }
        escapeValues = new Uint32Array(msg.escapeValues);
        currentIteration += stepSize;
        _events.fire(_events.renderImage, new Uint8ClampedArray(msg.imageDataBuffer));
        _events.fire(_events.frameComplete);

        if(running) postMessage();

        palette = undefined;
        extents = undefined;
    }

    on(_events.requestEscapeValues, function () {
        shouldPublishEscapeValues = true;
    });

    on(_events.paletteChanged, function (_palette) {
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

    return {
        stop: function () {
            running = false;
        },
        start: function () {
            running = true;
            postMessage();
        },
        destroy: function () {
            worker.terminate();
        }, escapeValues: function () {return escapeValues;}
    };
};