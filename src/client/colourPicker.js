namespace("jim.colour.colourPicker");
jim.colour.colourPicker.create = function (canvas, gradient) {
    "use strict";
    var image = jim.image.createSimpleImage(canvas);
    var interpolate = jim.interpolator.create().interpolate;
    var w = canvas.width;
    var h = canvas.height;
    var selectedHue;
    var selectedShade;

    var toRgb = function(h,s,v) {
        var colour = tinycolor({h:h, s: s, v: v}).toRgb();
        colour.a = 255;
        return colour;
    };

    var huePicker = function (x) {
        var hue = interpolate(0, 359, x/w);
        return toRgb(hue, 100, 100);
    };

    var shade = function (x, y, verticalSize) {
        var heightOffset = h - verticalSize;
        var translatedY = y - heightOffset;
        var saturation = interpolate(0, 1, (translatedY / verticalSize));

        var value = interpolate(1, 0, x/w);
        return {h:selectedHue, s:saturation, v:value};
    };

    var shadePicker = function (x, y, verticalSize) {
        var heightOffset = h - verticalSize;
        var translatedY = y - heightOffset;
        var saturation = interpolate(0, 1, (translatedY / verticalSize));

        var value = interpolate(1, 0, x/w);
        return toRgb(selectedHue, saturation, value);
    };



    var drawColourPicker = function (x, y) {
        var hueProportion = 0.3 * h;
        var shadeProportion = h - hueProportion;
        return y <= hueProportion ? huePicker(x) : shadePicker(x, y, shadeProportion);
    };

    var draw = function () {
        image.drawXY(drawColourPicker);
    };

    canvas.onclick = function (e) {
        if (e.layerY <= h/3) {
            selectedHue =  interpolate(0, 359, e.layerX/w);
            draw();
            gradient.setSelectedNodeColour(tinycolor({h:selectedHue, s:1, v:1}));
        } else {
            var hueProportion = 0.3 * h;
            var shadeProportion = h - hueProportion;
            gradient.setSelectedNodeColour(tinycolor(shade(e.layerX, e.layerY, shadeProportion)));
        }
    };

    selectedHue = 120;
    return {
        draw : draw
    };
};