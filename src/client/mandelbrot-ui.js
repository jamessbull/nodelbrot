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
        selection = newSelection(rect(0, 0, mandelbrotSet.canvas().width, mandelbrotSet.canvas().height));

    canvas.onmousedown = function (e) {
        selection.begin(e);
    };

    canvas.onmouseup = function (e) {
        selection.end(e);
        mandelbrotSet.zoomTo(selection);
    };

    canvas.onmousemove = function (e) {
        if (selection.inProgress) {
            selection.change(e);
        }
    };

    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.show(context);
        }
    };
};