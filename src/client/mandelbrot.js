

var mandelbrotImage = {};

mandelbrotImage.display = function () {
    "use strict";
    var coordFunc = mandelbrot.coordTranslator.create(600),
        escape = mandelbrot.escape.create(),
        state = mandelbrot.state.create(600, coordFunc),
        palette = mandelbrot.colour.palette.create(),
        mset = mandelbrot.set.create(state, escape, palette),

        segment1 = jim.segment.create(200, 0,   0, mset),
        segment2 = jim.segment.create(200, 200, 0, mset),
        segment3 = jim.segment.create(200, 400, 0, mset),
        segment4 = jim.segment.create(200, 0,   200, mset),
        segment5 = jim.segment.create(200, 200, 200, mset),
        segment6 = jim.segment.create(200, 400, 200, mset),
        segment7 = jim.segment.create(200, 0,   400, mset),
        segment8 = jim.segment.create(200, 200, 400, mset),
        segment9 = jim.segment.create(200, 400, 400, mset),
        segments = [segment1, segment2, segment3, segment4, segment5, segment6, segment7, segment8, segment9],
        screen = jim.screen.create({segments: segments});
    anim.create(screen.draw).start();
};

