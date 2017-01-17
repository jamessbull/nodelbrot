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
    var histoData2;
    var imgData;
    var histogramTotal;
    var reset;
    var deadRegions;

    var resetState = function () {
        escapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        imageEscapeValues = new Uint32Array(new ArrayBuffer(noOfPixels * 4));
        histoData = new Uint32Array(250000);
        histoData2 = new Uint32Array(250000);  //histogramDataBuffer
        imgData = new Uint8ClampedArray(4 * noOfPixels);
        histogramTotal = 0;
        reset = true;
        deadRegions = new Uint32Array(noOfPixels);
    };
    resetState();

    var theState = {

        histoData: histoData,
        histoData2: histoData2,
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
            this.shouldTransferExtents = true;
            this.reset = true;
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