namespace("jim.mandelbrot.ui");
jim.mandelbrot.ui.create = function (mandelbrotSet) {
    "use strict";
    var rect = jim.rectangle.create,
        newSelection = jim.selection.create,
        selectionHeight = document.getElementById("selectionHeight"),
        selectionWidth = document.getElementById("selectionWidth"),
        selectionX = document.getElementById("selectionX"),
        selectionY = document.getElementById("selectionY"),
        canvas = document.getElementById("mandelbrotCanvas"),
        selection = newSelection(rect(0, 0, mandelbrotSet.canvas().width, mandelbrotSet.canvas().height)),
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
        actions.forEach(function (action) {action.leftMouseDown(e);});
    };

    canvas.onmouseup = function (e) {
        actions.forEach(function (action) {action.leftMouseUp(e);});
    };

    canvas.onmousemove = function (e) {
        actions.forEach(function (action) {action.moveMouse(e);});
    };

    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.show(context);
        }
    };
};