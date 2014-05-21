

var mandelbrotImage = {};

mandelbrotImage.create = function (size) {
    "use strict";
    var coords = mandelbrot.coords(500).mapToSetNumbers(),
        mandSet = mandelbrot.createSet(coords),
        palette = mandelbrot.colour.palette.create(),
        image = jim.image.create(500);
    return function () {
        var colours = palette.intoColours(mandSet()),
            f = function (i) {
                return colours[i];
            };
        image.drawByIndex(f);
        return image.data;
    };
};

