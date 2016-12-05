namespace("jim.colourCalculator");
jim.colourCalculator.create = function () {
    "use strict";

    var pixelCount = 0;
    return {
        nu:function (x, y, LN2, sqrt, log) {
            return log(log(sqrt((x * x) + (y * y))) /  LN2) / LN2;
        },
        interpolate: jim.interpolator.create().interpolate,
        forPoint: function (x, y, iterations, histogram, palette) {
            var nu;
            var iterationFloor;
            var lower;
            var higher;
            var fractionalPart;
            var iteration;
            var interpolatedColour;
            var sqrt = Math.sqrt;
            var log = Math.log;
            var LN2 = Math.LN2;
            var floor = Math.floor;

            //nu = log(log(sqrt((x * x) + (y * y))) /  LN2) / LN2;
            iteration = iterations + 1 - this.nu(x, y, LN2, sqrt, log);
            iterationFloor = floor(iteration);

            fractionalPart = iteration - iterationFloor;

            lower = histogram.percentEscapedBy(iterationFloor - 1);
            higher = histogram.percentEscapedBy(iterationFloor);

            interpolatedColour = this.interpolate(lower, higher, fractionalPart);
            return palette.colourAt(interpolatedColour);
        },
        black: jim.colour.create(0, 0, 0, 255)
    };
};


namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_canvas, _width, _height, _state, _events) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var noOfPixels = _width * _height;
    var shouldShowDeadRegions = false;
    var shouldCalculateDeadRegions = false;
    var deadRegionCanvas = document.createElement('canvas');
    var radius = 0;

    deadRegionCanvas.width = _width;
    deadRegionCanvas.height = _height;

    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    function postMessage() {
        worker.postMessage(message(), [_state.histoData.buffer, _state.imgData.buffer]);
    }

    var running = true;
    function updateImage() {
        var context = _canvas.getContext('2d');
        var imageData = new ImageData(_state.imgData, _width, _height);
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
            histogramDataBuffer: _state.histoData.buffer,
            imageDataBuffer: _state.imgData.buffer,
            currentIteration:  _state.currentIteration,
            iterations: _state.stepSize,
            width: _width,
            height: _height,
            histogramTotal: _state.histogramTotal
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
            _state.imgData = new Uint8ClampedArray(msg.imageDataBuffer);
            _state.histoData = new Uint32Array(msg.histogramDataBuffer);  //histogramDataBuffer
            _state.histogramTotal = msg.histogramTotal;
            _state.currentIteration +=_state.stepSize;
            _state.escapedByCurrentIteration = _state.histoData[_state.currentIteration];
        } else {
            _state.histoData = new Uint32Array(250000);
            _state.deadRegions = new Uint32Array(noOfPixels);
            _state.imgData = new Uint8ClampedArray(4 * noOfPixels);
            _state.currentIteration = 0;
            _state.stepSize = 50;
            _state.histogramTotal = 0;
            _state.reset=false;
            _state.maxIterations = 0;
        }
        _events.fire("frameComplete", _state);
        if (shouldCalculateDeadRegions) {
            _state.deadRegions = calculateDeadRegions(radius);
        }
        updateImage();
        if(running) {
            postMessage();
        }
    };


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
        var deadRegions = jim.mandelbrot.deadRegions.create(_state.escapeValues, _width);
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

    _events.listenTo("showDeadRegions", function (_radius) {
        shouldCalculateDeadRegions = true;
        shouldShowDeadRegions = true;
        radius = _radius;
    });

    _events.listenTo("hideDeadRegions", function (_radius) {
        shouldCalculateDeadRegions = false;
        shouldShowDeadRegions = false;
        radius = _radius;
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


namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY, startingExtent, _events) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        palette         = jim.palette.create(),
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        colours         = jim.colourCalculator.create(),
        maxIterations   = 0,
        chunkSize      = 100,
        p,
        deadPixelRadius = 1,
        black = jim.colour.create(0,0,0,255),
        fromScreen = function (x, y) { return screen.at(x, y).translateTo(currentExtents);};

    var noOfPixels = sizeX * sizeY;
    var escapeValues;
    var imageEscapeValues;
    var escapedByCurrentIteration = 0;
    var histoData;
    var imgData;
    var currentIteration;
    var stepSize;
    var histogramTotal;
    var reset;
    var deadRegions;

    var resetState = function () {
        escapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        imageEscapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        histoData = new Uint32Array(250000);
        imgData = new Uint8ClampedArray(4 * noOfPixels);
        currentIteration = 0;
        stepSize = 10;
        histogramTotal = 0;
        reset = true;
        deadRegions = new Uint32Array(noOfPixels);
    };
    resetState();

    var theState = {

        histoData: histoData,
        imgData: imgData,
        currentIteration: currentIteration,
        stepSize: stepSize,
        histogramTotal: histogramTotal,
        reset: reset,
        deadRegions: deadRegions,
        shouldTransferExtents: true,
        shouldTransferPalette: true,

        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            this.shouldTransferExtents = true;
            this.reset = true;

        },
        resize: function (sizeX, sizeY) {
            screen = aRectangle(0, 0, sizeX - 1, sizeY - 1);
        },
        zoomOut: function () {
            if (previousExtents.length > 0) {
                currentExtents = previousExtents.pop();
                this.reset = true;
                this.shouldTransferExtents = true;
            }
        },
        move: function (moveX, moveY) {
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            this.reset = true;
        },
        drawFunc: function (x, y) {

        },
        palette: function () {
            return palette;
        },
        getExtents: function () {
            return currentExtents;
        },
        setExtents: function (extents) {
            currentExtents = extents;
            maxIterations = 0;
            reset = true;
            this.shouldTransferExtents = true;
        },
        maximumIteration: function () {
            return this.currentIteration;
        },
        setDeadPixelRadius: function (n) {
            deadPixelRadius = parseInt(n);
        },
        currentPointColour: function (x,y) {
            var index = ((y * sizeX) +x) * 4;
            var r = imgData[index];
            var g = imgData[index] + 1;
            var b = imgData[index] + 2;
            var a = imgData[index] + 3;
            return {r: r, g:g, b:b, a:a};
        },
        at: function (x, y) {
            if (grid.xSize()<=x || grid.ySize()<=y || x<0 || y<0) {
                return Object.create(jim.mandelbrot.basepoint);
            }
            return grid.at(x, y);
        }
    };

    _events.listenTo("paletteUpdated", function () {
        theState.shouldTransferPalette = true;
    });

    return theState;
};