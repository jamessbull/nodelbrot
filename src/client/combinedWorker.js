var window = self;

importScripts(
    '/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/stopWatch.js',
    '/js/setProcessor.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/histogram.js',
    '/js/mandelbrotEscape.js'
);
var setProcessor = jim.worker.msetProcessor.create();
var palette = jim.palette.create();
var colour = jim.colourCalculator.create();
var histogram = jim.twoPhaseHistogram.create(0);
var histogramForColour = jim.twoPhaseHistogram.create(0);

onmessage = function(e) {
    "use strict";
    var msg = e.data;
    var xState = new Float64Array(msg.xStateBuffer);
    var yState = new Float64Array(msg.yStateBuffer);
    var imageEscapeValues = new Uint32Array(msg.imageEscapeValuesBuffer);
    var escapeValues = new Uint32Array(msg.escapeValuesBuffer);
    var histogramData = new Uint32Array(msg.histogramDataBuffer);
    var histogramTotal = msg.histogramTotal;
    var imageData = new Uint8ClampedArray(msg.imageDataBuffer);
    palette.fromNodeList(msg.paletteNodes);


    histogram.setData( histogramData, histogramTotal);
    histogramForColour.setData(new Uint32Array(histogramData), histogramTotal);
    histogramForColour.process();


    function postStateBack() {
        postMessage(message(), [xState.buffer, yState.buffer, escapeValues.buffer, histogramData.buffer, imageData.buffer, imageEscapeValues.buffer]);
    }

    function message () {
        return {
            xStateBuffer:xState.buffer,
            yStateBuffer:yState.buffer,
            escapeValuesBuffer: escapeValues.buffer,
            imageEscapeValuesBuffer: imageEscapeValues.buffer,
            histogramDataBuffer: histogramData.buffer,
            imageDataBuffer: imageData.buffer,
            histogramTotal: histogram.histogramTotal
        };
    }

    var pixelStateTracker = {
        updateImageData: function (i, j, _p, _imageData, _histogram, _colour, _palette, _width) {
            var currentPixelPos = (j * _width + i);
            var currentRGBArrayPos = currentPixelPos * 4;
            var pixelColour = _p.imageEscapedAt !== 0 ? _colour.forPoint(_p.x, _p.y, _p.imageEscapedAt, _histogram, _palette): {r:0, g:0, b:0, a:255};
            _imageData[currentRGBArrayPos] = pixelColour.r;
            _imageData[currentRGBArrayPos + 1] = pixelColour.g;
            _imageData[currentRGBArrayPos + 2] = pixelColour.b;
            _imageData[currentRGBArrayPos + 3] = pixelColour.a;
        },
        updateHistogramData: function (_p, _histogram, _startIteration, _noOfIterations) {
            if (_p.histogramEscapedAt !== 0 && _p.histogramEscapedAt >= _startIteration && _p.histogramEscapedAt <= (_startIteration + _noOfIterations)) {
                _histogram.add(_p.histogramEscapedAt);
            }
        },
        getPixel: function (i, j) {
            var index = (j * msg.width) +i;
            return {
                x: xState[index],
                y: yState[index],
                histogramEscapedAt: escapeValues[index],
                imageEscapedAt: imageEscapeValues[index]
            };
        },
        putPixel: function (p,i,j) {
            var index = (j * msg.width) +i;
            xState[index] = p.x;
            yState[index] = p.y;
            escapeValues[index] = p.histogramEscapedAt;
            imageEscapeValues[index] = p.imageEscapedAt;
            this.updateHistogramData(p, histogram, msg.currentIteration, msg.iterations);
            this.updateImageData(i, j, p, imageData, histogramForColour, colour, palette, msg.width);
        }
    };

    setProcessor.processSet(msg, pixelStateTracker, msg.currentIteration, msg.iterations, msg.width, msg.height, 9007199254740991, []);
    postStateBack();
};