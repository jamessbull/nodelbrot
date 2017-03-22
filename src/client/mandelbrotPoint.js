namespace("jim.newMandelbrotPoint");
jim.newMandelbrotPoint.create = function () {
    "use strict";

    var histogramEscapeValue = 4;
    var imageEscapeValue = 9007199254740991;

    function output (_mx, _my, _x, _y, _iterations, _histogramEscapedAt, _imageEscapedAt) {
        return {mx: _mx, my:_my, x:_x, y: _y, iterations:_iterations, histogramEscapedAt: _histogramEscapedAt, imageEscapedAt:_imageEscapedAt};
    }

    function input(_mx, _my, _x, _y, _histogramEscapedAt) {
        return output(_mx, _my, _x, _y, 0, _histogramEscapedAt, 0);
    }

    function calcObject(p, startAt, times) {
        return calculate(p.mx, p.my, times, startAt, p.x, p.y, p.histogramEscapedAt);
    }

    function calculate (_mx, _my, _noOfIterations, _startIteration, _x, _y, _histogramEscapedAt) {
        var x = _x;
        var y = _y;
        var timesToRun = _noOfIterations;
        var iterations = 0;
        var imageEscapedAt = 0;
        var histogramEscapedAt = _histogramEscapedAt;
        var xSquared = 0;
        var ySquared = 0;
        var xSquaredPlusYSquared = 0;
        var alreadyEscaped = false;
        if (_histogramEscapedAt !== 0) {
            alreadyEscaped = true;
        }

        while (timesToRun > 0 && imageEscapedAt === 0) {
            xSquared = x * x;
            ySquared = y * y;
            xSquaredPlusYSquared = xSquared + ySquared;

            iterations++;
            if (xSquaredPlusYSquared < imageEscapeValue) {
                y = ((x * y) *2 ) + _my;
                x = xSquared - ySquared + _mx;
            }

            timesToRun -=1;

            if(histogramEscapedAt === 0 && xSquaredPlusYSquared > histogramEscapeValue) {
                histogramEscapedAt = iterations;
            }

            if(imageEscapedAt === 0 && xSquaredPlusYSquared > imageEscapeValue) {
                imageEscapedAt = iterations;
            }
        }
        var finalHistogramEscapeValue;
        if (alreadyEscaped) {
            finalHistogramEscapeValue = _histogramEscapedAt;
        } else {
            finalHistogramEscapeValue = histogramEscapedAt === 0 ? 0 : _startIteration + histogramEscapedAt;
        }
        var finalImageEscapeValue = imageEscapedAt === 0 ? 0 : _startIteration + imageEscapedAt;
        return output(_mx, _my, x, y, _startIteration + iterations,finalHistogramEscapeValue, finalImageEscapeValue);
    }

    return {
        calculate : calculate,
        calcObject: calcObject,
        input: input
    };
};