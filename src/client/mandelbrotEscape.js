namespace("jim.colourCalculator");
jim.colourCalculator.create = function () {
    "use strict";
    return {
        nu:function (x, y, LN2, sqrt, log) {
            //nu = Math.log(Math.log(zn) / Math.log(2)) / Math.log(2);
            var zn = sqrt((x * x) + (y * y));
            var logznOnTwo = log(zn) /  LN2;
            return log(logznOnTwo) / LN2;
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

    var theState = {
        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        resize: function (sizeX, sizeY) {
            screen = aRectangle(0, 0, sizeX - 1, sizeY - 1);
        },
        zoomOut: function () {
            if (previousExtents.length > 0) {
                currentExtents = previousExtents.pop();
                _events.fire(_events.extentsUpdate, currentExtents);
            }
        },
        notFullyZoomedOut: function () {
            return previousExtents.length > 0;
        },
        move: function (moveX, moveY) {
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        getExtents: function () {
            return currentExtents;
        },
        getLastExtents: function () {
            if (previousExtents.length === 0) return currentExtents;
            return previousExtents[previousExtents.length - 1];
        },
        setExtents: function (extents) {
            currentExtents = extents;
            maxIterations = 0;
            _events.fire(_events.extentsUpdate, currentExtents);
        }
    };

    on(_events.zoomOutAction, function () {
        theState.zoomOut();
    });

    on(_events.zoomInAction, function (_selection) {
        theState.zoomTo(_selection);
    });

    on(_events.moveSetAction, function (_location) {
       theState.move(_location.x, _location.y);
    });
    return theState;
};

namespace("jim.mandelbrot.escapeDistributionHistogram");
jim.mandelbrot.escapeDistributionHistogram.create = function (_events, _histoData) {
    "use strict";
    var currentTotal = 0;
    var called = 0;
    var lastTimeRound = 0;

    function processHistogramUpdates(updateInfo) {
        var updates = updateInfo.update;
        var lastIterationCalculated = updateInfo.currentIteration;
        called +=1;
        var runningTotal = 0;
        for (var i = 0; i < updates.length; i += 1) {
            runningTotal += updates[i];
            var initialValue = lastIterationCalculated > lastTimeRound ? currentTotal : _histoData[lastIterationCalculated + i];
            _histoData[lastIterationCalculated + i] = runningTotal + initialValue;
        }
        currentTotal += runningTotal;
        lastTimeRound = lastIterationCalculated;
        _events.fire(_events.morePixelsEscaped, currentTotal);
        return new Uint32Array(_histoData);
    }

    on(_events.histogramUpdateReceivedFromWorker, function (updateInfo) {
        var updated = processHistogramUpdates(updateInfo);
        var histoData = {array: updated, total: currentTotal, currentIteration: updateInfo.currentIteration};
        _events.fire(_events.histogramUpdated, histoData);
    });

    on(_events.extentsUpdate, function () {
        _histoData = new Uint32Array(250000);
        currentTotal = 0;
        lastTimeRound = 0;
    });
    return {};
};

namespace("jim.mandelbrot.pixelEscapeRateTracker");
jim.mandelbrot.pixelEscapeRateTracker.create = function (events) {
    "use strict";
    var lastCheckpoint = 0;
    var counter = 0;
    var escaped = 0;
    var running = true;

    function restart() {
        events.fire(events.restart);
        counter = 0;
        lastCheckpoint = 0;
    }

    on(events.zoomInAction, function () {
        restart();
    });

    on(events.zoomOutAction, function () {
        restart();
    });

    on(events.moveSetAction, function () {
        restart();
    });

    var target = 700 * 40;

    on(events.morePixelsEscaped, function (_totalEscaped) {
        counter +=1;

        if (lastCheckpoint !== _totalEscaped) {
            counter = 0;
        }

        if (lastCheckpoint === _totalEscaped && counter > 30 && _totalEscaped > target) {
            events.fire(events.stop);
            running = false;
            counter = 0;
            lastCheckpoint = 0;
        }
        lastCheckpoint = _totalEscaped;
    });
};

namespace("jim.mandelbrot.imageRenderer");
jim.mandelbrot.imageRenderer.create = function (_events, _canvas, _width, _height) {
    "use strict";
    var context = _canvas.getContext('2d');
    var imageData = context.getImageData(0,0,_width, _height);
    var screenData = imageData.data;

    on(_events.renderImage, function (args) {
        screenData.set(args.imgData, args.offset);
    });

    on(_events.andFinally, function () {
        context.putImageData(imageData, 0, 0);
    });

    return {};
};
