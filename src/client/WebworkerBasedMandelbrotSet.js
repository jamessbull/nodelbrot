namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_canvas, _width, _height, _state, _events) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var noOfPixels = _width * _height;
    var shouldPublishEscapeValues = false;
    var copyOfHisto = new Uint32Array(250000);
    var displayCountdown = 0;
    var stepSize = 50;
    var currentIteration = 0;
    var escapeValues;
    var msgPayload = {};

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

        if (_state.shouldTransferExtents) {
            msgPayload.extents = extentsTransfer(extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height());
            _state.shouldTransferExtents = false;
        }

        return msgPayload;
    }

    worker.onmessage = function (m) {
        var msg = m.data;
        if(!_state.reset) {
            copyOfHisto = processHistogramUpdates(new Uint32Array(msg.histogramUpdate));
            currentIteration += stepSize;
            _state.escapedByCurrentIteration = _state.histoData[currentIteration];
            _events.fire(_events.maxIterationsUpdated, currentIteration);
            escapeValues = new Uint32Array(msg.escapeValues);

        } else {
            _state.histoData = new Uint32Array(250000);
            copyOfHisto = new Uint32Array(250000);
            _state.deadRegions = new Uint32Array(noOfPixels);
            escapeValues = new Uint32Array(noOfPixels);
            currentIteration = 0;
            stepSize = 50;
            _state.reset=false;
            _state.maxIterations = 0;
        }
        if (shouldPublishEscapeValues) {
            _events.fire(_events.escapeValuesPublished, new Uint32Array(msg.escapeValues));
            shouldPublishEscapeValues = false;
        }
        if(_state.shouldTransferExtents) {
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
    };

    function processHistogramUpdates(updates) {
        for (var i = 0; i < updates.length; i+=1) {
            _state.histoData[currentIteration + i] += updates[i];
        }
        return new Uint32Array(_state.histoData);
    }

    on(_events.requestEscapeValues, function () {
        shouldPublishEscapeValues = true;
    });

    on(_events.paletteChanged, function (_palette) {
        msgPayload.paletteNodes = _palette.toNodeList();
    });

    on(_events.extentsUpdate, function () {
        shouldPublishEscapeValues = false;
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