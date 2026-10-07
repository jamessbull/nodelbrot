import { rectangle } from "./geometry.js";

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
            _events.fire(_events.viewChanged, currentExtents);
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
                _events.fire(_events.viewChanged, currentExtents);
            }
        },
        notFullyZoomedOut: function () {
            return previousExtents.length > 0;
        },
        move: function (moveX, moveY) {
            const distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            _events.fire(_events.viewChanged, currentExtents);
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
            _events.fire(_events.viewChanged, currentExtents);
        },
        // Shows all of extents, centred, with more around it in whichever direction the display's shape needs.
        showView: function (extents) {
            currentExtents = fitView(extents, sizeX, sizeY);
            _events.fire(_events.viewChanged, currentExtents);
        }
    };

    on(_events.zoomOut, function () {
        theState.zoomOut();
    });

    on(_events.zoomToSelection, function (_selection) {
        theState.zoomTo(_selection);
    });

    on(_events.moveBy, function (_location) {
       theState.move(_location.x, _location.y);
    });

    on(_events.transformView, function (transform) {
        theState.transform(transform);
    });
    return theState;
}
