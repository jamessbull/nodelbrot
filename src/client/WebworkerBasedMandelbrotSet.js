namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_canvas, _width, _height, _state, _events) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var noOfPixels = _width * _height;
    var shouldShowDeadRegions = false;
    var shouldCalculateDeadRegions = false;
    var deadRegionCanvas = document.createElement('canvas');
    var radius = 0;
    var copyOfHisto = new Uint32Array(250000);
    var displayCountdown = 0;
    var stepSize = 50;
    var currentIteration = 0;
    var escapeValues;
    var on = _events.listenTo;


    deadRegionCanvas.width = _width;
    deadRegionCanvas.height = _height;

    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    function postMessage() {
        worker.postMessage(message(), [copyOfHisto.buffer]);
    }

    var running = true;
    function updateImage(_imgData) {
        var context = _canvas.getContext('2d');
        var imageData = new ImageData(_imgData, _width, _height);
        context.putImageData(imageData, 0, 0);
        if (shouldShowDeadRegions) {
            context.drawImage(deadRegionCanvas, 0, 0);
        }
    }

    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    function message() {
        var extents = _state.getExtents();
        var palette = _state.palette();
        var messagePayload = {
            histogramDataBuffer: copyOfHisto.buffer,
            currentIteration:  currentIteration,
            iterations: stepSize,
            width: _width,
            height: _height
        };
        if (_state.shouldTransferExtents) {
            messagePayload.extents = extentsTransfer(extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height());
            _state.shouldTransferExtents = false;
        }
        if (_state.shouldTransferPalette) {
            messagePayload.paletteNodes = palette.toNodeList();
            _state.shouldTransferPalette = false;
        }
        return messagePayload;
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
        //_events.fire("frameComplete", _state);
        if (shouldCalculateDeadRegions) {
            _state.deadRegions = calculateDeadRegions(radius);
        }
        if(_state.shouldTransferExtents) {
            displayCountdown = 2;
        }
        if (displayCountdown >0 ) {
            displayCountdown -=1;
        } else {
            updateImage(new Uint8ClampedArray(msg.imageDataBuffer));
        }
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

    function setPixel(index, array, colour) {
        var base = index * 4;
        array[base + 0] = colour.r;
        array[base + 1] = colour.g;
        array[base + 2] = colour.b;
        array[base + 3] = colour.a;
    }

    function calculateDeadRegions(deadPixelRadius) {
        var context = deadRegionCanvas.getContext('2d');
        var deadRegionData = new Uint8ClampedArray(4 *_width * _height);
        var deadRegions = jim.mandelbrot.deadRegions.create(escapeValues, _width);
        var parsedRadius = parseInt(deadPixelRadius ? deadPixelRadius : 1, 10);

        var deadRegionsArray = deadRegions.regions(parsedRadius);

        deadRegionsArray.forEach(function (deadPoint, i) {
            if (deadPoint) {
                setPixel(i, deadRegionData, {r:80,g:80,b:80,a:256});
            } else {
                setPixel(i, deadRegionData, {r:1,g:1,b:1,a:0});
            }
        });

        context.putImageData(new ImageData(deadRegionData, _width, _height), 0, 0);
        shouldCalculateDeadRegions = false;
        return deadRegionsArray;
    }

    on("showDeadRegions", function (_radius) {
        shouldCalculateDeadRegions = true;
        shouldShowDeadRegions = true;
        radius = _radius;
    });



    on("hideDeadRegions", function (_radius) {
        shouldCalculateDeadRegions = false;
        shouldShowDeadRegions = false;
        radius = _radius;
    });

    on(_events.extentsUpdate, function () {
        shouldShowDeadRegions = false;
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