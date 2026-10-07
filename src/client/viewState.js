import { shiftView, viewShowing } from "./view.js";
import { smallestPixel } from "./precision.js";

// The view shown on a width x height display (see view.js), and the views zoomed in from, for zooming out
// again. Fires viewChanged with the view whenever it changes.
export function createViewState(width, height, startingView, events) {
    const on = events.listenTo;
    let view = startingView;
    const previousViews = [];

    // Zooming in stops at the smallest pixel.
    const zoomed = (newPixelSize) => Math.max(smallestPixel, newPixelSize);

    function show(newView) {
        view = newView;
        events.fire(events.viewChanged, view);
    }

    const middleX = () => (width - 1) / 2;
    const middleY = () => (height - 1) / 2;

    const theState = {
        // Zooms in to the area of a selection on the display, a rectangle in pixels the display's shape.
        zoomTo: function (selection) {
            const area = selection.area();
            const shrink = area.width() / (width - 1);
            previousViews.push(view);
            show(shiftView(view, area.x + (area.width() / 2) - middleX(), area.y + (middleY() * shrink) - middleY(),
                zoomed(view.pixelSize * shrink)));
        },
        // For a display that is now newWidth x newHeight. Views keep their centre and zoom, so a bigger
        // display shows more.
        resize: function (newWidth, newHeight) {
            width = newWidth;
            height = newHeight;
        },
        zoomOut: function () {
            if (previousViews.length > 0) {
                show(previousViews.pop());
            }
        },
        notFullyZoomedOut: function () {
            return previousViews.length > 0;
        },
        // Moves the image by (moveX, moveY) pixels, so the view moves the other way.
        move: function (moveX, moveY) {
            show(shiftView(view, -moveX, -moveY));
        },
        getView: function () {
            return view;
        },
        getLastView: function () {
            return previousViews.length === 0 ? view : previousViews[previousViews.length - 1];
        },
        // The area of the complex plane the display shows, in doubles.
        getArea: function () {
            return view.area(width, height);
        },
        // Changes the view as a pinch or drag changed the image: a point that was at screen position p is
        // now at scale * p + (translateX, translateY). Zooming out goes back to before a pinch, but not a
        // drag, as with moving by mouse.
        transform: function ({scale, translateX, translateY}) {
            if (scale !== 1) {
                previousViews.push(view);
            }
            // The new centre is where the point now at the middle of the display used to be.
            const dx = ((middleX() - translateX) / scale) - middleX();
            const dy = ((middleY() - translateY) / scale) - middleY();
            show(shiftView(view, dx, dy, zoomed(view.pixelSize / scale)));
        },
        // Shows all of a w x h area centred on (x, y) (doubles or decimal strings), centred, with more
        // around it in whichever direction the display's shape needs.
        showArea: function ({x, y, w, h}) {
            const fitted = viewShowing(x, y, w, h, width, height);
            show(fitted.pixelSize < smallestPixel ? shiftView(fitted, 0, 0, smallestPixel) : fitted);
        }
    };

    on(events.zoomOut, function () {
        theState.zoomOut();
    });

    on(events.zoomToSelection, function (selection) {
        theState.zoomTo(selection);
    });

    on(events.moveBy, function (location) {
       theState.move(location.x, location.y);
    });

    on(events.transformView, function (transform) {
        theState.transform(transform);
    });
    return theState;
}
