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

var newSetProcessor = jim.worker.msetProcessor.create;

onmessage = function(e) {
    "use strict";
    var setProcessor = newSetProcessor(e.data);
    var id = e.data.id;
    //console.log("Starting " + id);

    var palette = jim.palette.create();
    palette.fromNodeList(e.data.paletteNodes);
    var colour = jim.colourCalculator.create(palette);

    var histogram    = jim.twoPhaseHistogram.create(e.data.histogramSize);
    histogram.setData(e.data.histogramData, e.data.histogramTotal);
    histogram.process();

    var imgData = new Uint8ClampedArray(setProcessor.height * setProcessor.width * 4);
    var currentPixelPos = 0;
    var currentRGBArrayPos = 0;
    var pixelColour = {};

    var processPixelResult = function (i,j,x,y, iterations, escapedAt) {
        currentPixelPos = (j * setProcessor.width + i);
        currentRGBArrayPos = currentPixelPos * 4;

        pixelColour = escapedAt !== 0 ? colour.forPoint(x, y, iterations, histogram, palette): {r:0, g:0, b:0, a:255};
        imgData[currentRGBArrayPos] = pixelColour.r;
        imgData[currentRGBArrayPos + 1] = pixelColour.g;
        imgData[currentRGBArrayPos + 2] = pixelColour.b;
        imgData[currentRGBArrayPos + 3] = pixelColour.a;
    };

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

    setProcessor.setProcessPixelResult(processPixelResult);
    setProcessor.processSetForImage(e.data.deadRegions);
    //console.log("Finished " + id);

    postMessage(response(setProcessor.width * setProcessor.height, true, imgData));
};