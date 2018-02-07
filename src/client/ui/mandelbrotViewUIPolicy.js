namespace("jim.mandelbrot.mandelbrotViewUIPolicy");
jim.mandelbrot.mandelbrotViewUIPolicy.create = function (_mainCanvas, _events) {
    "use strict";
    var exploring = true;
    var selectingArea = false;
    var leftMouseButton = 0;
    var rightMouseButton = 2;

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

    return { };
};