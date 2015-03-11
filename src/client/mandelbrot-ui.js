namespace("jim.mandelbrot.ui");
jim.mandelbrot.ui.create = function (mandelbrotSet) {
    "use strict";
    var selectionHeight = document.getElementById("selectionHeight"),
        selectionWidth = document.getElementById("selectionWidth"),
        selectionX = document.getElementById("selectionX"),
        selectionY = document.getElementById("selectionY"),
        canvas = document.getElementById("mandelbrotCanvas"),
        selection = jim.selection.create();

    canvas.onmousedown = function (e) {
        selection.begin(e);
    };

    canvas.onmouseup = function (e) {
        selection.end(e);
        mandelbrotSet.zoomTo(selection);
    };

    canvas.onmousemove = function (e) {
        selection.change(e);
    };
    return {
        draw: function (canvas) {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            selection.canvas = canvas;
            selection.show(context);
        }
    };
};