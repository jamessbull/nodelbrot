namespace("jim.mandelbrot.mandelbrotViewUIPolicy");
jim.mandelbrot.mandelbrotViewUIPolicy.create = function (_mainCanvas, _events) {
    "use strict";
    var exploring = true;
    var leftMouseButton = 0;
    var rightMouseButton = 2;

    on(_events.examinePixelState, function () {
        exploring = false;
    });

    on(_events.stopExaminingPixelState, function () {
        exploring = true;
    });

    function mouseDown(e) {
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                _events.fire(_events.beginSelectionAction, {x: e.layerX, y: e.layerY});
                _events.fire(_events.leftMouseDown, {x: e.layerX, y: e.layerY});
            }
            if (e.button === rightMouseButton) {
                _events.fire(_events.beginMoveAction, {x: e.layerX, y: e.layerY});
            }
        } else {
            _events.fire(_events.examinePixelAction, {x: e.layerX, y: e.layerY})
        }
    }

    function mouseUp(e) {
        e.preventDefault();
        if (exploring) {
            if (e.button === leftMouseButton) {
                _events.fire(_events.endSelectionAction, {x: e.layerX, y: e.layerY});
            }
            if (e.button === rightMouseButton) {
                _events.fire(_events.endMoveAction, {x: e.layerX, y: e.layerY});
            }
        }
    }

    function mouseMove(e) {
        e.preventDefault();
        if (exploring) {
            _events.fire(_events.selectionChanged, {x: e.layerX, y: e.layerY});
            _events.fire(_events.viewMoveAction, {x: e.layerX, y: e.layerY});
        } else {
            _events.fire(_events.mouseMoved, {x: e.layerX, y: e.layerY});
        }
    }

    _mainCanvas.addEventListener("mousedown",  mouseDown);
    _mainCanvas.addEventListener("mouseup", mouseUp);
    _mainCanvas.addEventListener("mousemove", mouseMove);

    return { };
};