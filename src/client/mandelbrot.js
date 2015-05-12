namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function () {
    "use strict";
    var state = jim.mandelbrot.state.create(700, 400),
        segments2 = jim.segment.createSegments(700, 400, 4, state),
        screen = jim.screen.create({segments: segments2});

    return {
        canvas: function () {
            return screen.canvas;
        },
        draw: function () {
            screen.draw();
        },
        zoomTo: function (selection) {
            state.zoomTo(selection);
        },
        zoomOut: function () {
            state.zoomOut();
        }
    };
};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var currentMandelbrotSet = jim.mandelbrotImage.create(),
        canvasDiv = document.getElementById("mandelbrotCanvas"),
        ui = jim.mandelbrot.ui.create(currentMandelbrotSet, canvasDiv, currentMandelbrotSet.canvas().width, currentMandelbrotSet.canvas().height),
        uiCanvas = document.createElement('canvas'),
        render = function () {
            currentMandelbrotSet.draw();
            ui.draw(uiCanvas);
        };
    uiCanvas.width = currentMandelbrotSet.canvas().width;
    uiCanvas.height = currentMandelbrotSet.canvas().height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(currentMandelbrotSet.canvas());
    canvasDiv.appendChild(uiCanvas);
    jim.anim.create(render).start();
};

