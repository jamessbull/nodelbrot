namespace("jim.mandelbrot.ui");
jim.mandelbrot.ui.create = function (mandelbrotSet, canvas, w, h) {
    "use strict";
    var rect = jim.rectangle.create,
        newSelection = jim.selection.create,
        selection = newSelection(rect(0, 0, w, h)),
        timer = jim.stopwatch.create(),
        zoomAction = jim.actions.selectArea.create(selection),
        doubleClickAction = jim.actions.doubleclick.create(timer),
        actions = [zoomAction, doubleClickAction];


    zoomAction.onTrigger(function () {
        mandelbrotSet.zoomTo(selection);
    });
    doubleClickAction.onTrigger(function () {
        console.log("Double click triggered");
        mandelbrotSet.zoomOut();
    });

    canvas.onmousedown = function (e) {
        if (e.button === 0)
            actions.forEach(function (action) {action.leftMouseDown(e);});
        if (e.button === 2)
            actions.forEach(function (action) { action.rightMouseDown(e);});
    };

    canvas.onmouseup = function (e) {
        actions.forEach(function (action) {
            if (e.button === 0)
                action.leftMouseUp(e);
            if (e.button === 2)
                action.rightMouseUp(e);
        });
    };

    canvas.onmousemove = function (e) {
        actions.forEach(function (action) {action.moveMouse(e);});
    };

    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.show(context);
        },
        actions: actions,
        canvas: canvas
    };
};