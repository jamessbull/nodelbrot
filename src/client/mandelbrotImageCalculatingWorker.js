var window = self;

importScripts('/js/common.js','/js/stopWatch.js', '/js/tinycolor.js', '/js/palette.js',
    '/js/histogram.js', '/js/mandelbrotEscape.js',
    '/js/selection.js', '/js/mandelbrot-ui.js', '/js/mandelbrot.js', '/js/colourPicker.js');


onmessage = function(e) {
    "use strict";
    console.log('About to start to building mandelbrot image data');

    var height = e.data.exportHeight;
    var width = e.data.exportWidth;
    var maxIter = e.data.maxIterations;
    var mandelbrotBounds = jim.rectangle.create(e.data.mx, e.data.my, e.data.mw, e.data.mh);
    var displayBounds = jim.rectangle.create(0,0, width - 1, height -1);
    var mx = 0;
    var my = 0;
    var x = 0;
    var y = 0;
    var escapedAt = 0;
    var iterations = 0;
    var tempX = 0;
    var escapeCheck = function (x, y) {
        return ((x * x) + (y * y)) < 4;
    };
    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);
    var colour = jim.colourCalculator.create(palette);

    var doneCheck = function (x, y) {
        return ((x * x) + (y * y)) < 9007199254740991;
    };
    var response = function (progress, complete, imgData) {
        var retVal = {};
        retVal.progress = progress;
        retVal.imageDone = complete;
        retVal.imgData = imgData;
        return retVal;
    };

    var translator   = jim.coord.translator2.create();
    var fromTopLeftX = displayBounds.topLeft().x;
    var fromTopLeftY = displayBounds.topLeft().y;
    var toTopLeftX   = mandelbrotBounds.topLeft().x;
    var toTopLeftY   = mandelbrotBounds.topLeft().y;
    var fromWidth    = displayBounds.width();
    var fromHeight   = displayBounds.height();
    var toWidth      = mandelbrotBounds.width();
    var toHeight     = mandelbrotBounds.height();
    var histogram    = jim.twoPhaseHistogram.create(e.data.histogramSize);

    histogram.setData(e.data.histogramData, e.data.histogramTotal);
    histogram.process();
    var imgData = new Uint8ClampedArray(height * width * 4);
    var currentArrayPos = 0;
    var pixelColour = {};

    for (var j = 0 ; j < height; j +=1) {
        for (var i = 0 ; i < width; i += 1) {
            iterations = 0;
            x = 0;
            y = 0;
            escapedAt = 0;
            mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
            my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);
            while (doneCheck(x, y) && iterations <= maxIter) {
                iterations ++;
                if (escapedAt === 0 && !escapeCheck(x, y)) {
                    escapedAt = iterations;
                }
                tempX = x * x - y * y + mx;
                y = 2 * x * y + my;
                x = tempX;
            }
            pixelColour = escapedAt !== 0 ? colour.forPoint({x:x, y:y, iterations: iterations}, histogram): {r:0, g:0, b:0, a:255};
            currentArrayPos = (j * width + i) * 4;
            imgData[currentArrayPos] = pixelColour.r;
            imgData[currentArrayPos + 1] = pixelColour.g;
            imgData[currentArrayPos + 2] = pixelColour.b;
            imgData[currentArrayPos + 3] = pixelColour.a;
        }
        postMessage(response("Completed " + j + " of " + height + " rows.", false, []));
    }

    postMessage(response("Completed " + j + " of " + height + " rows.", true, imgData));
};