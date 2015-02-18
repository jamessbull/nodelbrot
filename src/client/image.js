var jim = {};
jim.image = {};
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
                output.data[i * 4]     = col.red;
                output.data[i * 4 + 1] = col.green;
                output.data[i * 4 + 2] = col.blue;
                output.data[i * 4 + 3] = col.alpha;
            }
            context.putImageData(output, 0, 0);
        },
        drawXYOffset: function (xOff, yOff) {
            var col, x, y, i, mandX, mandY;
            for (i = 0; i < size * sizeY; i += 1) {
                x = i % size;
                y = Math.floor(i / size);
                mandX = x + xOff;
                mandY = y + yOff;
                col = f(mandX, mandY);
                output.data[i * 4]     = col.red;
                output.data[i * 4 + 1] = col.green;
                output.data[i * 4 + 2] = col.blue;
                output.data[i * 4 + 3] = col.alpha;
            }
            context.putImageData(output, 0, 0);
        },
        drawByIndex: function (f) {
            var col, i;
            for (i = 0; i < size * sizeY; i += 1) {
                col = f(i);
                output.data[i * 4]     = col.red;
                output.data[i * 4 + 1] = col.green;
                output.data[i * 4 + 2] = col.blue;
                output.data[i * 4 + 3] = col.alpha;
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
jim.colour = {};
jim.colour.create = function (r, g, b, a) {
    "use strict";
    return {red: r, green: g, blue: b, alpha: a};
};

jim.canvas = {};
jim.canvas.create = function (w, h) {
    return {

    };
};