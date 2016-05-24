var window = self;

importScripts('/js/common.js','/js/stopWatch.js', '/js/tinycolor.js', '/js/palette.js',
    '/js/histogram.js', '/js/mandelbrotEscape.js',
    '/js/selection.js', '/js/mandelbrot-ui.js', '/js/mandelbrot.js', '/js/colourPicker.js');
var wi = 0;
var floor        = Math.floor;
var subsampleMultiplier= 0;
var pos = 0;
var drp = function (i, j) {
    return (floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier);
};

var amIBothered = function (i, j, deadRegionInfo) {
    "use strict";
    //return true;
    pos = (floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier);
    return deadRegionInfo[pos - 701] || deadRegionInfo[pos - 700] || deadRegionInfo[pos - 699] ||
           deadRegionInfo[pos - 1]   || deadRegionInfo[pos]       || deadRegionInfo[pos + 1]   ||
           deadRegionInfo[pos + 699] || deadRegionInfo[pos + 700] || deadRegionInfo[pos + 701];
};

onmessage = function(e) {
    "use strict";

    var height = e.data.exportHeight;
    var width = e.data.exportWidth;
    wi = width;
    subsampleMultiplier = width / 700;
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
        return ((x * x) + (y * y)) <= 4;
    };
    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);

    var colour = jim.colourCalculator.create(palette);

    var doneCheck = function (x, y) {
        return ((x * x) + (y * y)) < 9007199254740991; //9007199254740991
    };
    var response = function (progress, complete, imgData) {
        var retVal = e.data;
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.imageDone = complete;
        retVal.result.imgData = imgData;
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
    var floor        = Math.floor;
    var deadRegionInfo = e.data.deadRegions;
    histogram.setData(e.data.histogramData, e.data.histogramTotal);
    histogram.process();
    var imgData = new Uint8ClampedArray(height * width * 4);
    var currentPixelPos = 0;
    var currentRGBArrayPos = 0;
    var pixelColour = {};
    var percentComplete;
    var translatedIndex = 0;
    var noOfPixels = height * width;
    var deadRegionPos = 0;

    for (var j = 0 ; j < height; j +=1) {
        for (var i = 0 ; i < width; i += 1) {
            iterations = 0;
            x = 0;
            y = 0;
            escapedAt = 0;
            currentPixelPos = (j * width + i);
            mx = translator.translateX(fromTopLeftX, fromWidth, toTopLeftX, toWidth, i);
            my = translator.translateY(fromTopLeftY, fromHeight, toTopLeftY, toHeight, j);

            while (doneCheck(x, y) && iterations <= maxIter && amIBothered(i,j, deadRegionInfo)) {
                iterations ++;
                if (escapedAt === 0 && !escapeCheck(x, y)) {
                    escapedAt = iterations;
                }
                tempX = x * x - y * y + mx;
                y = 2 * x * y + my;
                x = tempX;
            }

            currentRGBArrayPos = currentPixelPos * 4;

            pixelColour = escapedAt !== 0 ? colour.forPoint(x, y, iterations, histogram, palette): {r:0, g:0, b:0, a:255};
            imgData[currentRGBArrayPos] = pixelColour.r;
            imgData[currentRGBArrayPos + 1] = pixelColour.g;
            imgData[currentRGBArrayPos + 2] = pixelColour.b;
            imgData[currentRGBArrayPos + 3] = pixelColour.a;
        }
        percentComplete = "" + (((j * (width))  /  (height * width)) * 100).toFixed(2);
        postMessage(response("" + percentComplete + "%", false, []));
    }

    percentComplete = "" + (((j * (width))  /  (height * width)) * 100).toFixed(2);
    postMessage(response("" + percentComplete +"%", true, imgData));
};