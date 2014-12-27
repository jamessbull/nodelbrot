

var mandelbrotImage = {};

mandelbrotImage.display = function () {
    "use strict";
    var coordFunc = mandelbrot.coordTranslator.create(700, 400),
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
        state = mandelbrot.state.create(700, 400, coordFunc),
        palette = mandelbrot.colour.palette.create(),
        mset = mandelbrot.set.create(state, escape, palette),
        segments2 = jim.segment.createSegments(700, 400, 4, mset),
        screen = jim.screen.create({segments: segments2});
    anim.create(screen.draw).start();
};

