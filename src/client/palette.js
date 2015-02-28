namespace("jim.palette");
jim.palette.create = function () {
    "use strict";
    var pal = [], i, currentColour;

    for (i = 360; i > 0; i -= 1) {
        currentColour = tinycolor({h: i, s: 100, v: 100}).toRgb();
        currentColour.a = 255;
        pal.push(currentColour);
    }

    return {
        colourAt: function (number) {
            var hue = number.iterations %  360;
            return pal[hue];
        }
    };
};
