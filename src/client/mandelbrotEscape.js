import { rectangle } from "./geometry.js";

// Starting size of the escape histogram. It grows when deeper iterations are reached.
export const initialHistogramSize = 250000;

// The view at the same centre and pixel size on a display newWidth x newHeight pixels instead of
// oldWidth x oldHeight, so a bigger display shows more around it, at the same zoom.
export function refitView(view, oldWidth, oldHeight, newWidth, newHeight) {
    const width = (view.width() / (oldWidth - 1)) * (newWidth - 1);
    const height = (view.height() / (oldHeight - 1)) * (newHeight - 1);
    return rectangle(view.x + ((view.width() - width) / 2), view.y + ((view.height() - height) / 2), width, height);
}

// The smallest view with the same centre as view that shows all of it on a width x height display, with
// square pixels.
export function fitView(view, width, height) {
    const pixelSize = Math.max(view.width() / (width - 1), view.height() / (height - 1));
    const fittedWidth = pixelSize * (width - 1);
    const fittedHeight = pixelSize * (height - 1);
    return rectangle(view.x + ((view.width() - fittedWidth) / 2), view.y + ((view.height() - fittedHeight) / 2), fittedWidth, fittedHeight);
}

// The view: the rectangle of the complex plane shown on a sizeX x sizeY display, and the views zoomed
// in from, for zooming out again.
export function createViewState(sizeX, sizeY, startingExtent, _events) {
    const on = _events.listenTo;
    let currentExtents = startingExtent;
    let previousExtents = [];
    let screen = rectangle(0, 0, sizeX - 1, sizeY - 1);
    const fromScreen = (x, y) => screen.at(x, y).translateTo(currentExtents);

    const theState = {
        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        // For a display that is now newX x newY: keeps the view, and the views zoomed in from, at the
        // same centre and zoom.
        resize: function (newX, newY) {
            const refit = (view) => refitView(view, sizeX, sizeY, newX, newY);
            currentExtents = refit(currentExtents);
            previousExtents = previousExtents.map(refit);
            sizeX = newX;
            sizeY = newY;
            screen = rectangle(0, 0, sizeX - 1, sizeY - 1);
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
            const distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
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
        // Changes the view as a pinch or drag changed the image: a point that was at screen position p is
        // now at scale * p + (translateX, translateY). Zooming out goes back to before a pinch, but not a
        // drag, as with moving by mouse.
        transform: function ({scale, translateX, translateY}) {
            if (scale !== 1) {
                previousExtents.push(currentExtents.copy());
            }
            const topLeft = fromScreen(-translateX / scale, -translateY / scale);
            currentExtents = rectangle(topLeft.x, topLeft.y, currentExtents.width() / scale, currentExtents.height() / scale);
            _events.fire(_events.extentsUpdate, currentExtents);
        },
        // Shows all of extents, centred, with more around it in whichever direction the display's shape needs.
        showView: function (extents) {
            currentExtents = fitView(extents, sizeX, sizeY);
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

    on(_events.transformAction, function (transform) {
        theState.transform(transform);
    });
    return theState;
}

// The cumulative count of escapes at each iteration, built from the workers' updates.
export function createEscapeHistogram(_events, _histoData) {
    const on = _events.listenTo;
    let currentTotal = 0;
    let lastTimeRound = 0;
    let filledLength = 0;       // entries at and beyond this index have not been written yet, so are zero

    function ensureCapacity(size) {
        if (size > _histoData.length) {
            const grown = new Uint32Array(Math.max(size, _histoData.length * 2));
            grown.set(_histoData);
            _histoData = grown;
        }
    }

    function processHistogramUpdates(updateInfo) {
        const updates = updateInfo.update;
        const lastIterationCalculated = updateInfo.currentIteration;
        ensureCapacity(lastIterationCalculated + updates.length);
        let runningTotal = 0;
        for (let i = 0; i < updates.length; i += 1) {
            runningTotal += updates[i];
            const initialValue = lastIterationCalculated > lastTimeRound ? currentTotal : _histoData[lastIterationCalculated + i];
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
        const histoData = {array: _histoData, filledLength: filledLength, total: currentTotal, currentIteration: updateInfo.currentIteration};
        _events.fire(_events.histogramUpdated, histoData);
    });

    on(_events.extentsUpdate, function () {
        _histoData = new Uint32Array(initialHistogramSize);
        currentTotal = 0;
        lastTimeRound = 0;
        filledLength = 0;
    });
    return {};
}

export function createAutoStop(events, pixelCount) {
    const on = events.listenTo;
    // A tenth of the image must have escaped before rendering can stop on its own.
    const target = pixelCount / 10;
    let totalEscaped = 0;
    let totalAtLastFrame = 0;
    let framesWithoutEscapes = 0;

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

    on(events.transformAction, function () {
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
}

// Draws the renderer's image on the canvas after each frame.
export function createImageRenderer(_events, _canvas, _width, _height) {
    const on = _events.listenTo;
    const context = _canvas.getContext('2d');
    let imageData;      // wraps the renderer's image buffer, so drawing it needs no copy
    let imageBuffer;

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
}
