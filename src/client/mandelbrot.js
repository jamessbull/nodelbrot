namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function () {
    "use strict";
    var called = 0,
        total = 700 * 400,
        notifier = {
            notify: function () {
                //var remaining = total - called;
                //called = called + 1;
                //document.getElementById("numberEscaped").innerHTML = remaining;
            }
        },
        escape = jim.mandelbrot.escape.create(notifier),
        state = jim.mandelbrot.state.create(700, 400),
        palette = jim.palette.create(),
        mset = jim.mandelbrot.set.create(state, escape, palette),
        segments2 = jim.segment.createSegments(700, 400, 4, mset),
        screen = jim.screen.create({segments: segments2});

    return {
        canvas: function () {
            return screen.canvas;
        },
        calculateEveryPoint: function () {
            mset.drawAll();
        },
        draw: function () {
            screen.draw();
        },
        zoomTo: function (selection) {
            state.zoomTo(selection);
            //mset.setState(jim.mandelbrot.state.create(1400, 800));
        }
    };
};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var currentMandelbrotSet = jim.mandelbrotImage.create(),
        ui = jim.mandelbrot.ui.create(currentMandelbrotSet),
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
    jim.anim.create(render).start();
};

