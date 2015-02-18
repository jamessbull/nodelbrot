

var mandelbrotImage = {}, init = {};

mandelbrotImage.create = function () {
    "use strict";
    var coord = mandelbrot.coordTranslator.create(700, 400, -2.5, 1, -1, 1),
        called = 0,
        total = 700 * 400,
        notifier = {
            notify: function () {
                var remaining = total - called;
                called = called + 1;
                document.getElementById("numberEscaped").innerHTML = remaining;
            }
        },
        escape = mandelbrot.escape.create(notifier),
        state = mandelbrot.state.create(700, 400, coord.func),
        palette = mandelbrot.colour.palette.create(),
        mset = mandelbrot.set.create(state, escape, palette),
        segments2 = jim.segment.createSegments(700, 400, 4, mset),
        canvasDiv,
        screen = jim.screen.create({segments: segments2});

    return {
        canvas: function () {
            return screen.canvas;
        },
        context: function () {
            return screen.context;
        },
        draw: function () {
            screen.draw();
        },
        zoomTo: function (selection) {
            coord.zoomTo(selection);
            mset.setState(mandelbrot.state.create(700, 400, coord.func));
        }
    };
};

init.run = function () {
    "use strict";
    var currentMandelbrotSet = mandelbrotImage.create(),
        ui = mandelbrot.ui.create(currentMandelbrotSet),
        canvasDiv = document.getElementById("mandelbrotCanvas"),
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
    anim.create(render).start();
    console.log("I have finished");
};

