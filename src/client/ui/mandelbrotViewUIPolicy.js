import { forwardTouchToMouse } from "./touch.js";

export function createViewInteraction(_mainCanvas, _events) {
    const on = _events.listenTo;
    let exploring = true;
    let selectingArea = false;
    const leftMouseButton = 0;
    const rightMouseButton = 2;

    on(_events.examinePixelState, function () {
        exploring = false;
    });

    on(_events.stopExaminingPixelState, function () {
        exploring = true;
    });

    function mouseDown(e) {
        selectingArea = true;
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                _events.fire(_events.beginSelectionAction, {x: e.offsetX, y: e.offsetY});
                _events.fire(_events.leftMouseDown, {x: e.layerX, y: e.offsetY});
            }
            if (e.button === rightMouseButton) {
                _events.fire(_events.beginMoveAction, {x: e.offsetX, y: e.offsetY});
            }
        } else {
            _events.fire(_events.examinePixelAction, {x: e.offsetX, y: e.offsetY});
        }
    }

    function mouseUp(e) {
        selectingArea = false;
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                _events.fire(_events.endSelectionAction, {x: e.offsetX, y: e.offsetY});
            }
            if (e.button === rightMouseButton) {
                _events.fire(_events.endMoveAction, {x: e.offsetX, y: e.offsetY});
            }
        }
    }

    function mouseMove(e) {
        e.preventDefault();
        if (exploring && selectingArea) {
            _events.fire(_events.selectionChanged, {x: e.offsetX, y: e.offsetY});
            _events.fire(_events.viewMoveAction, {x: e.offsetX, y: e.offsetY});
        } else {
            _events.fire(_events.mouseMoved, {x: e.offsetX, y: e.offsetY});
        }
    }

    _mainCanvas.addEventListener("mousedown",  mouseDown);
    _mainCanvas.addEventListener("mouseup", mouseUp);
    _mainCanvas.addEventListener("mousemove", mouseMove);

    // A touch only starts a selection or move when exploring; when examining, the pixel is picked
    // where the touch ends.
    forwardTouchToMouse(_mainCanvas, {
        down: function (e) {
            if (exploring) {
                mouseDown(e);
            }
        },
        move: mouseMove,
        up: function (e) {
            if (exploring) {
                mouseUp(e);
            } else {
                _events.fire(_events.examinePixelAction, {x: e.offsetX, y: e.offsetY});
            }
        },
        cancel: mouseUp
    });

    return { };
}
