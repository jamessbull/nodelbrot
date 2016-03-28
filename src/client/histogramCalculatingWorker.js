var window = self;

importScripts('/js/common.js','/js/stopWatch.js', '/js/tinycolor.js', '/js/palette.js',
    '/js/histogram.js', '/js/mandelbrotEscape.js',
    '/js/selection.js', '/js/mandelbrot-ui.js', '/js/mandelbrot.js', '/js/colourPicker.js');


onmessage = function(e) {
    "use strict";
    console.log('About to start to building histogram');

    var height = e.data.exportHeight;
    var width = e.data.exportWidth;
    var maxIter = e.data.maxIterations;
    var mandelbrotBounds = jim.rectangle.create(e.data.mx, e.data.my, e.data.mw, e.data.mh);
    var displayBounds = jim.rectangle.create(0,0, width - 1, height -1);
    var mx = 0;
    var my = 0;
    var x = 0;
    var y = 0;
    var iterations = 0;
    var tempX = 0;
    var escapeCheck = function (x, y) {
        return ((x * x) + (y * y)) < 4;
    };
    var response = function (progress, complete, histogramData, histogramTotal) {
        var retVal = {};
        retVal.progress = progress;
        retVal.chunkComplete = complete;
        retVal.histogramData = histogramData;
        retVal.histogramSize = maxIter;
        retVal.histogramTotal = histogramTotal;
        return retVal;
    };

    var translator = jim.coord.translator2.create();
    var fromTopLeftX = displayBounds.topLeft().x;
    var fromTopLeftY = displayBounds.topLeft().y;
    var toTopLeftX = mandelbrotBounds.topLeft().x;
    var toTopLeftY = mandelbrotBounds.topLeft().y;
    var fromWidth = displayBounds.width();
    var fromHeight = displayBounds.height();
    var toWidth = mandelbrotBounds.width();
    var toHeight = mandelbrotBounds.height();
    var histogramData = [];
    var histogramTotal = 0;
    for (var d = 0; d < maxIter; d+=1) {
        histogramData[d] = 0;
    }
    console.log('About to start to calcing histogram');

    for (var j = 0 ; j < height; j +=1) {
        for (var i = 0 ; i < width; i += 1) {
            iterations = 0;
            x = 0;
            y = 0;
            mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
            my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);
            while (escapeCheck(x, y) && iterations <= maxIter) {
                iterations ++;
                tempX = x * x - y * y + mx;
                y = 2 * x * y + my;
                x = tempX;
            }

            if (iterations < maxIter) {
                histogramData[iterations] +=1;
                histogramTotal +=1;
            }
        }
        postMessage(response("Completed " + j + " of " + height + " rows.", false, undefined, undefined));
    }
    postMessage(response("Completed " + j + " of " + height + " rows.", true, histogramData, histogramTotal));
};