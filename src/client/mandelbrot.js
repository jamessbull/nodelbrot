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
        },
        point: function (x, y) {
            return state.at(x,y);
        },
        move: function (x, y) {
            state.move(x, y);
        },
        histogram: function() {
            return state.histogram();
        },
        palette: function () {
            return state.palette();
        }
    };
};
var ui = {};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var currentMandelbrotSet = jim.mandelbrotImage.create(),
        canvasDiv = document.getElementById("mandelbrotCanvas"),
        pixelInfo = document.getElementById("pixelInfoCanvas"),
        colourPickerCanvas = document.getElementById("colourPickerCanvas"),
        colourGradientCanvas = document.getElementById("colourGradientCanvas"),
        colourPicker = jim.colour.colourPicker.create(colourPickerCanvas),
        colourGradientui = jim.colour.gradientui.create(colourGradientCanvas),
        lui = jim.mandelbrot.ui.create(
            currentMandelbrotSet,
            canvasDiv,
            currentMandelbrotSet.canvas().width,
            currentMandelbrotSet.canvas().height,
            pixelInfo),
        uiCanvas = document.createElement('canvas'),
        render = function () {
            currentMandelbrotSet.draw();
            lui.draw(uiCanvas);
        };
    pixelInfo.width = 162;
    pixelInfo.height = 162;
    ui = lui;
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = currentMandelbrotSet.canvas().width;
    uiCanvas.height = currentMandelbrotSet.canvas().height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(currentMandelbrotSet.canvas());
    canvasDiv.appendChild(uiCanvas);
    colourPicker.draw();
    colourGradientui.draw();
    jim.anim.create(render).start();
};

