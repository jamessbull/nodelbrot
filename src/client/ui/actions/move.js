namespace("jim.mandelbrot.actions.move");
jim.mandelbrot.actions.move.create = function (_events, _mandelbrotCanvas, _uiCanvas) {
    "use strict";

    var moving = false;
    var totalXMovement;
    var totalYMovement;
    var lastMouseXLocation;
    var lastMouseYLocation;
    var start = jim.coord.create();
    var deltaX;
    var deltaY;
    var cursorInMotion;

    on(_events.beginMoveAction, function (e) {
        moving = true;
        start.x = e.x;
        start.y = e.y;
        totalXMovement = 0;
        totalYMovement = 0;
        lastMouseXLocation = e.x;
        lastMouseYLocation = e.y;
    });

    on(_events.viewMoveAction, function (e) {
        if(!moving) return;
        totalXMovement = e.x - start.x;
        totalYMovement = e.y - start.y;
        deltaX = lastMouseXLocation - e.x;
        deltaY = lastMouseYLocation - e.y;
        lastMouseXLocation = e.x;
        lastMouseYLocation = e.y;
        cursorInMotion = true;
        show();
    });

    on(_events.endMoveAction, function (e) {
        moving = false;
        _events.fire(_events.hideDeadRegions);
        _events.fire(_events.moveSetAction, {x: e.x - start.x, y: e.y - start.y});
        _mandelbrotCanvas.getContext('2d').drawImage(_uiCanvas, 0, 0, _uiCanvas.width, _uiCanvas.height);
        _uiCanvas.getContext('2d').clearRect(0, 0, _uiCanvas.width, _uiCanvas.height);
    });

    function show() {
        var ctx = _uiCanvas.getContext('2d'), w = _uiCanvas.width, h = _uiCanvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(_mandelbrotCanvas, -totalXMovement, -totalYMovement, w, h);
    }

    return {};
};