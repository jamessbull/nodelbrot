var window = self;

importScripts('/js/common.js',
    '/js/stopWatch.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js',
    '/js/selection.js',
    '/js/mandelbrot-ui.js',
    '/js/mandelbrot.js',
    '/js/colourPicker.js',
    '/js/setProcessor.js');

var floor        = Math.floor;
var subsampleMultiplier= 0;
var pos = 0;

var amIBothered = function (i, j, deadRegionInfo) {
    "use strict";
    pos = (floor(j/subsampleMultiplier) * 700) + floor(i/subsampleMultiplier);
    return deadRegionInfo[pos - 701] || deadRegionInfo[pos - 700] || deadRegionInfo[pos - 699] ||
           deadRegionInfo[pos - 1]   || deadRegionInfo[pos]       || deadRegionInfo[pos + 1]   ||
           deadRegionInfo[pos + 699] || deadRegionInfo[pos + 700] || deadRegionInfo[pos + 701];
};
var doneCheck = function (x, y) {
    "use strict";
    return ((x * x) + (y * y)) < 9007199254740991;
};

var worker = jim.worker.msetProcessor.create;

onmessage = function(e) {
    "use strict";
    var mainWorker = worker(e.data);
    var height = mainWorker.height;
    var width = mainWorker.width;
    subsampleMultiplier = mainWorker.subSampleMultiplier;
    var maxIter = mainWorker.maximumNumberOfIterations;

    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);

    var colour = jim.colourCalculator.create(palette);



    var response = function (progress, complete, imgData) {
        var retVal = e.data;
        retVal.type = "progressReport";
        retVal.event = {msg: progress};
        retVal.result = {};
        retVal.result.progress = progress;
        retVal.result.imageDone = complete;
        retVal.result.imgData = imgData;
        return retVal;
    };

    var histogram    = jim.twoPhaseHistogram.create(e.data.histogramSize);
    var deadRegionInfo = e.data.deadRegions;
    histogram.setData(e.data.histogramData, e.data.histogramTotal);
    histogram.process();
    var imgData = new Uint8ClampedArray(height * width * 4);
    var currentPixelPos = 0;
    var currentRGBArrayPos = 0;
    var pixelColour = {};

    var thisPixelHasNotFinished = function (x,y,i,j,iterations) {
        return doneCheck(x, y) && iterations <= maxIter && amIBothered(i,j, deadRegionInfo);
    };

    var processPixelResult = function (i,j,x,y, iterations, escapedAt) {
        currentPixelPos = (j * width + i);
        currentRGBArrayPos = currentPixelPos * 4;

        pixelColour = escapedAt !== 0 ? colour.forPoint(x, y, iterations, histogram, palette): {r:0, g:0, b:0, a:255};
        imgData[currentRGBArrayPos] = pixelColour.r;
        imgData[currentRGBArrayPos + 1] = pixelColour.g;
        imgData[currentRGBArrayPos + 2] = pixelColour.b;
        imgData[currentRGBArrayPos + 3] = pixelColour.a;
    };
    mainWorker.setThisPixelHasNotFinished(thisPixelHasNotFinished);
    mainWorker.setProcessPixelResult(processPixelResult);
    mainWorker.processSet();
    postMessage(response(width * height, true, imgData));
};