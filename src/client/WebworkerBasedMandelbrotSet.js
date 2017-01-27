namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_canvas, _width, _height, _state, _events) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var shouldPublishEscapeValues = false;
    var copyOfHisto = new Uint32Array(250000);
    var displayCountdown = 0;
    var stepSize = 50;
    var currentIteration = 0;
    var msgPayload = {};
    var extentsUpdated = true;

    function postMessage() {
        var msgToPost = message();
        worker.postMessage(msgToPost, [copyOfHisto.buffer]);
        msgPayload.paletteNodes = undefined;
        msgPayload.extents = undefined;
    }

    var running = true;
    function updateImage(_imgData) {
        var context = _canvas.getContext('2d');
        var imageData = new ImageData(_imgData, _width, _height);
        context.putImageData(imageData, 0, 0);
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    function message() {
        var extents = _state.getExtents();
        msgPayload.histogramDataBuffer = copyOfHisto.buffer;
        msgPayload.currentIteration = currentIteration;
        msgPayload.iterations = stepSize;
        msgPayload.width = _width;
        msgPayload.height = _height;

        if (extentsUpdated) {
            msgPayload.extents = extentsTransfer(extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height());
        }

        return msgPayload;
    }

    worker.onmessage = function (m) {
        var msg = m.data;
        if(!extentsUpdated) {
            _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(msg.histogramUpdate), currentIteration: currentIteration});
            currentIteration += stepSize;
            _events.fire(_events.maxIterationsUpdated, currentIteration);
        } else {
            copyOfHisto = new Uint32Array(250000);
            currentIteration = 0;

        }
        if (shouldPublishEscapeValues) {
            _events.fire(_events.escapeValuesPublished, new Uint32Array(msg.escapeValues));
            shouldPublishEscapeValues = false;
        }
        if(extentsUpdated) {
            displayCountdown = 2;
        }
        if (displayCountdown >0 ) {
            displayCountdown -=1;
        } else {
            updateImage(new Uint8ClampedArray(msg.imageDataBuffer));
        }
        _events.fire("frameComplete");

        if(running) {
            postMessage();
        }
        extentsUpdated = false;
    };

    on(_events.requestEscapeValues, function () {
        shouldPublishEscapeValues = true;
    });

    on(_events.paletteChanged, function (_palette) {
        msgPayload.paletteNodes = _palette.toNodeList();
    });

    on(_events.extentsUpdate, function () {
        extentsUpdated = true;
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