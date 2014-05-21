var jim = {};
jim.image = {};
jim.image.create = function (size, f) {
    "use strict";
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        output = context.createImageData(size, size);
    canvas.width = size;
    canvas.height = size;
    document.body.appendChild(canvas);
    return {
        drawXY: function () {
            var col, x, y, i;
            for (i = 0; i < size * size; i += 1) {
                x = i % size;
                y = Math.floor(i / size);
                col = f(x, y);
                output.data[i * 4]     = col.red;
                output.data[i * 4 + 1] = col.green;
                output.data[i * 4 + 2] = col.blue;
                output.data[i * 4 + 3] = col.alpha;
            }
            context.putImageData(output, 0, 0);
        },
        drawByIndex: function (f) {
            var col, i;
            for (i = 0; i < size * size; i += 1) {
                col = f(i);
                output.data[i * 4]     = col.red;
                output.data[i * 4 + 1] = col.green;
                output.data[i * 4 + 2] = col.blue;
                output.data[i * 4 + 3] = col.alpha;
            }
            context.putImageData(output, 0, 0);
        },
        canvas: canvas
    };
};
jim.colour = {};
jim.colour.create = function (r, g, b, a) {
    "use strict";
    return {red: r, green: g, blue: b, alpha: a};
};
jim.screen = {};
jim.screen.create = function (document, w, h) {
    "use strict";
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        output = context.createImageData(w, h),
        indexFrom = function (x, y) {
            return (y * w) + x;
        },
        setPixelColour = function (x, y, col) {
            var i = indexFrom(x, y);
            output.data[i * 4]     = col.red;
            output.data[i * 4 + 1] = col.green;
            output.data[i * 4 + 2] = col.blue;
            output.data[i * 4 + 3] = col.alpha;
        },
        forAllPixels = function (f) {
            var i, j;
            for (i = 0; i < w; i += 1) {
                for (j = 0; j < h; j += 1) {
                    f(i, j);
                }
                j = 0;
            }
        };

    canvas.width = w;
    canvas.height = h;
    return {
        setColour: function (x, y, colour) {
            var image = context.getImageData(x, y, 1, 1);
            image.data[0] = colour.red;
            image.data[1] = colour.green;
            image.data[2] = colour.blue;
            image.data[3] = colour.alpha;
            //setPixelColour(x, y, colour);
            context.putImageData(image, x, y);
        },
        fill: function (colour) {
            forAllPixels(function (i, j) {
                setPixelColour(i, j, colour);
            });
            context.putImageData(output, 0, 0);
        },
        at: function (x, y) {
            var image = context.getImageData(x, y, 1, 1),
                i = indexFrom(x, y),
                red = image.data[0],
                green = image.data[1],
                blue = image.data[2],
                alpha = image.data[3];
            return jim.colour.create(red, green, blue, alpha);
        },
        drawImage: function (x, y, image) {
            context.drawImage(image.canvas, x, y);
        },
        addToDocument: function () {
            document.body.appendChild(canvas);
        },
        canvas: canvas
    };
};
jim.canvas = {};
jim.canvas.create = function (w, h) {
    return {

    };
};