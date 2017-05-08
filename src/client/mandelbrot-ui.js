namespace("jim.mandelbrot.ui.state");
jim.mandelbrot.ui.state.create = function () {
    "use strict";
    var mode = "normal";
    return {
        isSelectPixelMode : function () {
            return mode === "selectPixel";
        },
        setSelectPixelMode: function () {
            mode = "selectPixel";
        },
        setNormalMode: function () {
            mode = "normal";
        }
    };
};

jim.mandelbrot.ui.create = function (mandelbrotSet, canvas, w, h, pixelInfo, events) {
    "use strict";
    var state = jim.mandelbrot.ui.state.create(),
        rect = jim.rectangle.create,
        newSelection = jim.selection.create,
        selection = newSelection(rect(0, 0, w, h)),
        timer = jim.stopwatch.create(),
        zoomAction = jim.actions.selectArea.create(selection, mandelbrotSet, state),
        doubleClickAction = jim.actions.doubleclick.create(timer, mandelbrotSet, state),
        moveAction = jim.actions.move.create(mandelbrotSet, state),
        actions = [zoomAction, doubleClickAction, moveAction],
        mode = "normal";

    canvas.onmousedown = function (e) {
        if (e.button === 0){
            actions.forEach(function (action) {action.leftMouseDown(e);});
            events.fire(events.leftMouseDown, {x: e.layerX, y:e.layerY});
        }
        if (e.button === 2){
            actions.forEach(function (action) { action.rightMouseDown(e);});
            events.fire(events.rightMouseDown, {x: e.layerX, y:e.layerY});
        }

        return false;
    };

    canvas.onmouseup = function (e) {
        actions.forEach(function (action) {
            if (e.button === 0)
                action.leftMouseUp(e, mode);
            if (e.button === 2)
                action.rightMouseUp(e, mode);
        });
    };

    canvas.onmousemove = function (e) {
        actions.forEach(function (action) {action.moveMouse(e);});
        events.fire(events.mouseMoved, {x: e.layerX, y: e.layerY});
    };

    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.show(context);
            moveAction.show(context, canvas);
        },
        actions: actions,
        canvas: canvas
    };
};