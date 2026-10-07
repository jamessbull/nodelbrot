import { forwardTouchToMouse } from "./touch.js";

export function createViewInteraction(mainCanvas, events) {
    const on = events.listenTo;
    let exploring = true;
    let selectingArea = false;
    const leftMouseButton = 0;
    const rightMouseButton = 2;

    on(events.startExamining, function () {
        exploring = false;
    });

    on(events.stopExamining, function () {
        exploring = true;
    });

    function mouseDown(e) {
        selectingArea = true;
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                events.fire(events.selectionStart, {x: e.offsetX, y: e.offsetY});
                events.fire(events.leftButtonDown, {x: e.layerX, y: e.offsetY});
            }
            if (e.button === rightMouseButton) {
                events.fire(events.dragStart, {x: e.offsetX, y: e.offsetY});
            }
        } else {
            events.fire(events.examinePixelAt, {x: e.offsetX, y: e.offsetY});
        }
    }

    function mouseUp(e) {
        selectingArea = false;
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                events.fire(events.selectionEnd, {x: e.offsetX, y: e.offsetY});
            }
            if (e.button === rightMouseButton) {
                events.fire(events.dragEnd, {x: e.offsetX, y: e.offsetY});
            }
        }
    }

    function mouseMove(e) {
        e.preventDefault();
        if (exploring && selectingArea) {
            events.fire(events.selectionMove, {x: e.offsetX, y: e.offsetY});
            events.fire(events.dragMove, {x: e.offsetX, y: e.offsetY});
        } else {
            events.fire(events.pointerMoved, {x: e.offsetX, y: e.offsetY});
        }
    }

    mainCanvas.addEventListener("mousedown",  mouseDown);
    mainCanvas.addEventListener("mouseup", mouseUp);
    mainCanvas.addEventListener("mousemove", mouseMove);

    // Touches while exploring are gestures (see touchGestures.js). While examining, a finger moves the
    // magnifier, and the pixel is picked where it lifts.
    forwardTouchToMouse(mainCanvas, {
        move: function (e) {
            if (!exploring) {
                mouseMove(e);
            }
        },
        up: function (e) {
            if (!exploring) {
                events.fire(events.examinePixelAt, {x: e.offsetX, y: e.offsetY});
            }
        }
    }, () => !exploring);

    return { };
}
