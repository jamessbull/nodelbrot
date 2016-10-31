namespace("jim.colourCalculator");
jim.colourCalculator.create = function () {
    "use strict";
    var interpolate = jim.interpolator.create().interpolate;
    var nu,
        iterationFloor,
        lower,
        higher,
        fractionalPart,
        iteration,
        interpolatedColour;

    var sqrt = Math.sqrt;
    var log = Math.log;
    var LN2 = Math.LN2;
    var floor = Math.floor;
    var pixelCount = 0;
    return {
        forPoint: function (x, y, iterations, histogram, palette) {
            nu = log(log(sqrt((x * x) + (y * y))) /  LN2) / LN2;
            iteration = iterations + 1 - nu;
            iterationFloor = floor(iteration);

            fractionalPart = iteration - iterationFloor;

            lower = histogram.percentEscapedBy(iterationFloor - 1);
            higher = histogram.percentEscapedBy(iterationFloor);

            interpolatedColour = interpolate(lower, higher, fractionalPart);
            return palette.colourAt(interpolatedColour);
        },
        black: jim.colour.create(0, 0, 0, 255)
    };
};
namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.start = function (_canvas, _width, _height, _state) {
    "use strict";
    var worker = new Worker("/js/combinedWorker.js");
    var noOfPixels = _width * _height;
    function postMessage() {
        worker.postMessage(message(), [_state.xState.buffer, _state.yState.buffer, _state.escapeValues.buffer, _state.imageEscapeValues.buffer, _state.histoData.buffer, _state.imgData.buffer]);
    }

    function updateImage() {
        var context = _canvas.getContext('2d');
        var imageData = new ImageData(_state.imgData, _width, _height);
        context.putImageData(imageData, 0, 0);
    }

    function message() {
        var extents = _state.getExtents();
        var palette = _state.palette();
        return {
            xStateBuffer: _state.xState.buffer,
            histogramDataBuffer: _state.histoData.buffer,
            imageDataBuffer:  _state.imgData.buffer,
            yStateBuffer:  _state.yState.buffer,
            escapeValuesBuffer:  _state.escapeValues.buffer,
            imageEscapeValuesBuffer:  _state.imageEscapeValues.buffer,
            currentIteration:  _state.currentIteration,
            iterations:  _state.stepSize,
            width: _width,
            height: _height,
            mx: extents.topLeft().x,
            my: extents.topLeft().y,
            mw: extents.width(),
            mh: extents.height(),
            paletteNodes:palette.toNodeList(),
            histogramTotal: _state.histogramTotal
        };
    }

    worker.onmessage = function (m) {
        var msg = m.data;
        if(!_state.reset) {
            _state.xState = new Float64Array(msg.xStateBuffer);
            _state.yState = new Float64Array(msg.yStateBuffer);
            _state.escapeValues = new Uint32Array(msg.escapeValuesBuffer);
            _state.imgData = new Uint8ClampedArray(msg.imageDataBuffer);
            _state.histoData = new Uint32Array(msg.histogramDataBuffer);
            _state.histogramTotal = msg.histogramTotal;
            _state.imageEscapeValues = new Uint32Array(msg.imageEscapeValuesBuffer);
            _state.currentIteration +=_state.stepSize;
        } else {
            _state.xState = new Float64Array(new ArrayBuffer(noOfPixels * 8));
            _state.yState = new Float64Array(new ArrayBuffer(noOfPixels * 8));
            _state.escapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
            _state.imageEscapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
            _state.histoData = new Uint32Array(250000);
            _state.imgData = new Uint8ClampedArray(4 * noOfPixels);
            _state.currentIteration = 0;
            _state.stepSize = 100;
            _state.histogramTotal = 0;
            _state.reset=false;
        }
        updateImage();
        postMessage();
    };
    postMessage();
};


namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY, startingExtent, _events) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        palette         = jim.palette.create(),
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        histogram       = jim.histogram.create(),
        colours         = jim.colourCalculator.create(),
        maxIterations   = 0,
        chunkSize      = 100,
        p,
        deadPixelRadius = 1,
        black = jim.colour.create(0,0,0,255),
        fromScreen = function (x, y) { return screen.at(x, y).translateTo(currentExtents);};


        var getHistogram = function() {
            return histogram;
        };
    var noOfPixels = sizeX * sizeY;
    var xState;
    var yState;
    var escapeValues;
    var imageEscapeValues;
    var histoData;
    var imgData;
    var currentIteration;
    var stepSize;
    var histogramTotal;
    var reset;

    var resetState = function () {
        xState = new Float64Array(new ArrayBuffer(sizeX * sizeY * 8));
        yState = new Float64Array(new ArrayBuffer(noOfPixels * 8));
        escapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        imageEscapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        histoData = new Uint32Array(250000);
        imgData = new Uint8ClampedArray(4 * noOfPixels);
        currentIteration = 0;
        stepSize = 100;
        histogramTotal = 0;
        reset = true;
    };
    resetState();

    var theState = {
        xState: xState,
        yState: yState,
        escapeValues: escapeValues,
        imageEscapeValues: imageEscapeValues,
        histoData: histoData,
        imgData: imgData,
        currentIteration: currentIteration,
        stepSize: stepSize,
        histogramTotal: histogramTotal,
        reset: reset,

        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            this.reset = true;

        },
        resize: function (sizeX, sizeY) {
            screen = aRectangle(0, 0, sizeX - 1, sizeY - 1);
            //grid = aGrid(sizeX, sizeY, function (x, y) { return aPoint(fromScreen(x, y)); });
        },
        zoomOut: function () {
            if (previousExtents.length > 0) {
                currentExtents = previousExtents.pop();
                this.reset = true;
            }
        },
        move: function (moveX, moveY) {
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            //_events.fire("moved", currentExtents);
            this.reset = true;
        },
        drawFunc: function (x, y) {
//            p = grid.at(x, y);
//            if (p.iterations > maxIterations) maxIterations = p.iterations;
//            return p.calculateCurrentColour(chunkSize, getHistogram(), colours, palette);

            //return test;
        },
        histogram: function () {
            return getHistogram();
        },
        setHistogram: function (h) {
            histogram = h;
        },
        palette: function () {
            return palette;
        },
        setPalette: function (p) {
            palette = p;
        },
        getExtents: function () {
            return currentExtents;
        },
        setExtents: function (extents) {
            currentExtents = extents;
            //grid = newGrid();
            getHistogram().reset();
            maxIterations = 0;
            _events.fire("moved", currentExtents);
            //_events.fire("NewHistoRequired", currentExtents);
        },
        maximumIteration: function () {
            return maxIterations;
        },
        chunksize: function (c) {
            chunkSize = c;
        },
        setDeadPixelRadius: function (n) {
            deadPixelRadius = parseInt(n);
        },
        deadRegions : function () {
            var regions = escapeValues.map(function (escapeIteration) {
                return escapeIteration === 0;
            });

            var deadRegions = jim.mandelbrot.deadRegions.create(regions, sizeX);
            var parsedRadius = parseInt(deadPixelRadius ? deadPixelRadius : 1, 10);
            return  deadRegions.regions(parsedRadius);
        },
        currentPointColour: function (x,y) {
            if(grid.xSize()<=x || grid.ySize()<=y || x<0 || y<0) {
                return jim.colour.create(100,100,100,255);
            }
            var point = grid.at(x,y);

            var escaped = point.alreadyEscaped;
            return escaped ? colours.forPoint(point.x, point.y, point.iterations, getHistogram(), palette):black;
        },
        at: function (x, y) {
            if (grid.xSize()<=x || grid.ySize()<=y || x<0 || y<0) {
                return Object.create(jim.mandelbrot.basepoint);
            }
            return grid.at(x, y);
        }
    };

    _events.listenTo("histogramUpdateJustIn", function (_histogram) {
        theState.setHistogram(_histogram);
    });
    return theState;
};