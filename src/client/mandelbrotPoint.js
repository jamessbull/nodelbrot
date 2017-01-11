namespace("jim.newMandelbrotPoint");
jim.newMandelbrotPoint.create = function () {
    "use strict";
    var pixelResult = function (_x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt) {
        return {x:_x, y: _y, iterations:_iterations, histogramEscapedAt: _histogramEscapedAt, imageEscapedAt:_imageEscapedAt};
    };

    var histogramEscapeValue = 4;
    var imageEscapeValue = 9007199254740991;

    var calculate = function (_mx, _my, _noOfIterations, _startIteration, _x, _y, _histogramEscapedAt) {
        var x = _x;
        var y = _y;
        var timesToRun = _noOfIterations;
        var iterations = 1;
        var imageEscapedAt = 0;
        var histogramEscapedAt = _histogramEscapedAt;
        var xSquared = 0;
        var ySquared = 0;
        var xSquaredPlusYSquared = 0;

        while (timesToRun > 0 && imageEscapedAt === 0) {
            xSquared = x * x;
            ySquared = y * y;
            xSquaredPlusYSquared = xSquared + ySquared;

            if(histogramEscapedAt === 0 && xSquaredPlusYSquared > histogramEscapeValue) {
                histogramEscapedAt = iterations;
            }

            if(imageEscapedAt === 0 && xSquaredPlusYSquared > imageEscapeValue) {
                imageEscapedAt = iterations;
            }

            iterations++;
            y = ((x * y) *2 ) + _my;
            x = xSquared - ySquared + _mx;
            timesToRun -=1;
        }
        var finalHistogramEscapeValue = histogramEscapedAt === 0 ? 0 : _startIteration + histogramEscapedAt;
        var finalImageEscapeValue = imageEscapedAt === 0 ? 0 : _startIteration + imageEscapedAt;
        return pixelResult(x, y, _startIteration + iterations,finalHistogramEscapeValue, finalImageEscapeValue);
    };

    return {
        calculate : calculate
    };
};