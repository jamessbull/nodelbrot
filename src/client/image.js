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
        drawAndUpdate: function (f, reporter) {
            var col, x, y, i;
            for (i = 0; i < noOfPixels; i += 1) {
                x = i % w;
                y = Math.floor(i / w);
                col = f(x, y);
                reporter.report();
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


jim.image.create = function (size, sizeY, f) {
    "use strict";
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        output = context.createImageData(size, sizeY);
    canvas.width = size;
    canvas.height = sizeY;
    canvas.className = "canvas";
    return {
        drawXY: function () {
            var col, x, y, i;
            for (i = 0; i < size * sizeY; i += 1) {
                x = i % size;
                y = Math.floor(i / sizeY);
                col = f(x, y);
                output.data[i * 4]     = col.r;
                output.data[i * 4 + 1] = col.g;
                output.data[i * 4 + 2] = col.b;
                output.data[i * 4 + 3] = col.a;
            }
            context.putImageData(output, 0, 0);
        },
        drawXYOffset: function (xOff, yOff) {
//            var col, x, y, i, mandX, mandY;
//            for (i = 0; i < size * sizeY; i += 1) {
//                x = i % size;
//                y = Math.floor(i / size);
//                mandX = x + xOff;
//                mandY = y + yOff;
//                col = f(mandX, mandY);
//                output.data[i * 4]     = col.r;
//                output.data[i * 4 + 1] = col.g;
//                output.data[i * 4 + 2] = col.b;
//                output.data[i * 4 + 3] = col.a;
//            }
//            context.putImageData(output, 0, 0);
        },
        drawByIndex: function (f) {
            var col, i;
            for (i = 0; i < size * sizeY; i += 1) {
                col = f(i);
                output.data[i * 4]     = col.r;
                output.data[i * 4 + 1] = col.g;
                output.data[i * 4 + 2] = col.b;
                output.data[i * 4 + 3] = col.a;
            }
            context.putImageData(output, 0, 0);
        },
        darken: function () {
            context.fillStyle = "rgba(0, 0, 0, 0.4)";
            context.fillRect(0, 0, 700, 500);
        },
        canvas: canvas
    };
};

namespace("jim.canvas");
jim.canvas.create = function (w, h) {
    return {

    };
};