namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY, startingExtent, _events) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
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
    var lastTimeRound = 0;
    var filledLength = 0;       // entries at and beyond this index have not been written yet, so are zero

    function ensureCapacity(size) {
        if (size > _histoData.length) {
            var grown = new Uint32Array(Math.max(size, _histoData.length * 2));
            grown.set(_histoData);
            _histoData = grown;
        }
    }

    function processHistogramUpdates(updateInfo) {
        var updates = updateInfo.update;
        var lastIterationCalculated = updateInfo.currentIteration;
        ensureCapacity(lastIterationCalculated + updates.length);
        var runningTotal = 0;
        for (var i = 0; i < updates.length; i += 1) {
            runningTotal += updates[i];
            var initialValue = lastIterationCalculated > lastTimeRound ? currentTotal : _histoData[lastIterationCalculated + i];
            _histoData[lastIterationCalculated + i] = runningTotal + initialValue;
        }
        currentTotal += runningTotal;
        lastTimeRound = lastIterationCalculated;
        filledLength = Math.max(filledLength, lastIterationCalculated + updates.length);
        _events.fire(_events.morePixelsEscaped, currentTotal);
    }

    // Listeners get the live histogram rather than a copy, so they must not modify it, and must copy
    // it if they need it to stay unchanged.
    on(_events.histogramUpdateReceivedFromWorker, function (updateInfo) {
        processHistogramUpdates(updateInfo);
        var histoData = {array: _histoData, filledLength: filledLength, total: currentTotal, currentIteration: updateInfo.currentIteration};
        _events.fire(_events.histogramUpdated, histoData);
    });

    on(_events.extentsUpdate, function () {
        _histoData = new Uint32Array(jim.mandelbrot.initialHistogramSize);
        currentTotal = 0;
        lastTimeRound = 0;
        filledLength = 0;
    });
    return {};
};

namespace("jim.mandelbrot.pixelEscapeRateTracker");
jim.mandelbrot.pixelEscapeRateTracker.create = function (events, pixelCount) {
    "use strict";
    // A tenth of the image must have escaped before rendering can stop on its own.
    var target = pixelCount / 10;
    var totalEscaped = 0;
    var totalAtLastFrame = 0;
    var framesWithoutEscapes = 0;

    function restart() {
        events.fire(events.restart);
        totalEscaped = 0;
        totalAtLastFrame = 0;
        framesWithoutEscapes = 0;
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

    on(events.morePixelsEscaped, function (_totalEscaped) {
        totalEscaped = _totalEscaped;
    });

    // Stops rendering once no more pixels have escaped for 10 frames, if a fair amount of the image has.
    // This counts frames rather than worker replies, so it doesn't depend on how many workers there are.
    on(events.frameComplete, function () {
        framesWithoutEscapes = totalEscaped === totalAtLastFrame ? framesWithoutEscapes + 1 : 0;
        totalAtLastFrame = totalEscaped;
        if (framesWithoutEscapes > 10 && totalEscaped > target) {
            events.fire(events.stop);
            framesWithoutEscapes = 0;
        }
    });
};

namespace("jim.mandelbrot.imageRenderer");
jim.mandelbrot.imageRenderer.create = function (_events, _canvas, _width, _height) {
    "use strict";
    var context = _canvas.getContext('2d');
    var imageData;      // wraps the renderer's image buffer, so drawing it needs no copy
    var imageBuffer;

    // args.imgData is the whole image for the canvas (args.offset is always 0), and is the same
    // buffer every frame.
    on(_events.renderImage, function (args) {
        if (args.imgData !== imageBuffer) {
            imageBuffer = args.imgData;
            imageData = new ImageData(imageBuffer, _width, _height);
        }
    });

    on(_events.andFinally, function () {
        if (imageData) {
            context.putImageData(imageData, 0, 0);
        }
    });

    return {};
};
