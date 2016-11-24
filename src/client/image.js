namespace("jim.image");

jim.image.createSimpleImage = function (canvas) {
    "use strict";
    var context = canvas.getContext('2d'),
        w = canvas.width,
        h = canvas.height,
        noOfPixels = w * h,
        output;

    output = context.createImageData(w, h);

    return {
        drawXY: function (f) {
            var col, x, y, i;
            for (i = 0; i < noOfPixels; i += 1) {
                x = i % w;
                y = Math.floor(i / w);
                col = f(x, y);
                output.data[i * 4]     = col.r;
                output.data[i * 4 + 1] = col.g;
                output.data[i * 4 + 2] = col.b;
                output.data[i * 4 + 3] = col.a;
            }
            context.putImageData(output, 0, 0);
        },
        canvas: canvas
    };
};