namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var shouldPublishEscapeValues = false;
    var copyOfHisto = new Uint32Array(250000);
    var stepSize = _stepSize;
    var currentIteration = 0;
    var extents = null;
    var palette = null;
    var additionalMessagesInFlight = 0;

    function postMessage() {
        additionalMessagesInFlight +=1;
        var msg = {
            histogramDataBuffer: copyOfHisto.buffer,
            currentIteration : currentIteration,
            iterations : stepSize,
            width :_width,
            height :_height,
            extents: extents,
            paletteNodes: palette
        };

        worker.postMessage(msg, [copyOfHisto.buffer]);
    }

    var running = true;

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    worker.onmessage = function (m) {
        var msg = m.data;
        additionalMessagesInFlight-=1;
        if(additionalMessagesInFlight >0) return;

        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(msg.histogramUpdate), currentIteration: currentIteration});
        _events.fire(_events.maxIterationsUpdated, currentIteration);
        if (shouldPublishEscapeValues) {
            _events.fire(_events.escapeValuesPublished, new Uint32Array(msg.escapeValues));
            shouldPublishEscapeValues = false;
        }
        currentIteration += stepSize;
        _events.fire(_events.renderImage, new Uint8ClampedArray(msg.imageDataBuffer));
        _events.fire(_events.frameComplete);

        if(running) {
            postMessage();
        }

        palette = undefined;
        extents = undefined;
    };

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
    });

    on(_events.histogramUpdated, function (updatedHistogram) {
        copyOfHisto = updatedHistogram;
    });

    return {
        stop: function () {
            running = false;
        },
        start: function () {
            running = true;
            postMessage();
        }
    };
};