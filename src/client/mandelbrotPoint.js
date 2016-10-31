namespace("jim.newMandelbrotPoint");
jim.newMandelbrotPoint.create = function () {
    "use strict";
    var pixelResult = function (_x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt) {
        return {x:_x, y: _y, iterations:_iterations, histogramEscapedAt: _histogramEscapedAt, imageEscapedAt:_imageEscapedAt};
    };

    var histogramEscapeValue = 4;
    var imageEscapeValue = 9007199254740991;

    var calculate = function (_mx, _my, _noOfIterations, _escapeTest, _x, _y, _startIteration) {
        var x = _x === undefined ? 0 : _x;
        var y = _y === undefined ? 0 : _y;
        var iterations = 0;
        var imageEscapedAt = 0;
        var histogramEscapedAt = 0;
        var xSquared = 0;
        var ySquared = 0;
        var xSquaredPlusYSquared = 0;

        while (_noOfIterations > 0) {
            xSquared = x * x;
            ySquared = y * y;
            xSquaredPlusYSquared = xSquared + ySquared;

            if(histogramEscapedAt === 0 && xSquaredPlusYSquared > histogramEscapeValue) {
                histogramEscapedAt = iterations;
            }

            if(imageEscapedAt === 0 && xSquaredPlusYSquared > imageEscapeValue) {
                imageEscapedAt = iterations;
                break;
            }

            iterations++;
            y = ((x * y) *2 ) + _my;
            x = xSquared - ySquared + _mx;
            _noOfIterations-=1;
        }
        var finalHistogramEscapeValue = histogramEscapedAt === 0 ? 0 : _startIteration + histogramEscapedAt;
        var finalImageEscapeValue = imageEscapedAt === 0 ? 0 : _startIteration + imageEscapedAt;
        return pixelResult(x, y, _startIteration + iterations,finalHistogramEscapeValue, finalImageEscapeValue);
    };

    return {
        calculate : calculate
    };
};