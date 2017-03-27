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
            var log = Math.log;
            var LN2 = Math.LN2;
            var floor = Math.floor;

            nu = log( log( x*x + y*y ) / 2 / LN2 ) / LN2;
            iteration = iterations + 1 - nu;
            iterationFloor = floor(iteration);

            fractionalPart = iteration % 1;

            lower = histogram.percentEscapedBy(iterationFloor);
            higher = histogram.percentEscapedBy(iterationFloor + 1);

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
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        maxIterations   = 0,
        fromScreen = function (x, y) { return screen.at(x, y).translateTo(currentExtents);};

    var noOfPixels = sizeX * sizeY;
    var imgData;
    var histogramTotal;

    var resetState = function () {
        imgData = new Uint8ClampedArray(4 * noOfPixels);
        histogramTotal = 0;
    };
    resetState();

    var theState = {
        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            resetState();
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        resize: function (sizeX, sizeY) {
            screen = aRectangle(0, 0, sizeX - 1, sizeY - 1);
        },
        zoomOut: function () {
            if (previousExtents.length > 0) {
                currentExtents = previousExtents.pop();
                resetState();
                _events.fire(_events.extentsUpdate, currentExtents);
            }
        },
        move: function (moveX, moveY) {
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            resetState();
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        getExtents: function () {
            return currentExtents;
        },
        setExtents: function (extents) {
            currentExtents = extents;
            maxIterations = 0;
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        currentPointColour: function (x,y) {
            var index = ((y * sizeX) +x) * 4;
            var r = imgData[index];
            var g = imgData[index] + 1;
            var b = imgData[index] + 2;
            var a = imgData[index] + 3;
            return {r: r, g:g, b:b, a:a};
        }
    };
    return theState;
};

namespace("jim.mandelbrot.escapeDistributionHistogram");
jim.mandelbrot.escapeDistributionHistogram.create = function (_events) {
    "use strict";
    var histoData = new Uint32Array(250000);

    function processHistogramUpdates(updateInfo) {
        var updates = updateInfo.update;
        var lastIterationCalculated = updateInfo.currentIteration;
        var currentTotal;
        if (lastIterationCalculated === 0) {
            currentTotal = 0;
        } else {
            currentTotal = histoData[lastIterationCalculated - 1];
        }
        for (var i = 0; i < updates.length; i+=1) {
            var newTotal = (updates[i] + currentTotal);
            histoData[lastIterationCalculated + i] += newTotal;
            currentTotal = newTotal;
        }
        return new Uint32Array(histoData);
    }

    on(_events.histogramUpdateReceivedFromWorker, function (updateInfo) {
        var updated = processHistogramUpdates(updateInfo);
        _events.fire(_events.histogramUpdated, updated);
    });

    on(_events.extentsUpdate, function () {
        histoData = new Uint32Array(250000);
    });
    return {};
};

namespace("jim.mandelbrot.imageRenderer");
jim.mandelbrot.imageRenderer.create = function (_events, _canvas, _width, _height) {
    "use strict";
    on(_events.renderImage, function (_imgData) {
        var context = _canvas.getContext('2d');
        var imageData = new ImageData(_imgData, _width, _height);
        context.putImageData(imageData, 0, 0);
    });

    return {};
};
