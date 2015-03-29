namespace("jim.palette");
jim.palette.create = function () {
    "use strict";
    var pal = [], i, currentColour;

    return {
        colourAt: function (number, total) {
            var hue = (number *  360) / total,
                currentColour = tinycolor({h: hue, s: 360 - hue, v: 100}).toRgb();
            currentColour.a = 255;
            return currentColour;
        },
        toArray: function () { return pal; }
    };
};
