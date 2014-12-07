

var mandelbrotImage = {};

mandelbrotImage.display = function () {
    "use strict";
    var coordFunc = mandelbrot.coordTranslator.create(700, 400),
        escape = mandelbrot.escape.create(),
        state = mandelbrot.state.create(700, 400, coordFunc),
        palette = mandelbrot.colour.palette.create(),
        mset = mandelbrot.set.create(state, escape, palette),
        segments2 = jim.segment.createSegments(700, 400, 4, mset),
        screen = jim.screen.create({segments: segments2});
    anim.create(screen.draw).start();
};

