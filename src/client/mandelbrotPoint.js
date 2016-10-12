namespace("jim.newMandelbrotPoint");
jim.newMandelbrotPoint.create = function () {
    "use strict";
    var pixelResult = function (_x, _y, _iterations, _escapedAt) {
        return {x:_x, y: _y, iterations:_iterations, escapedAt: _escapedAt};
    };

    var calculate = function (_mx, _my, _noOfIterations, _escapeTest, _x, _y, _startIteration) {
        var x = _x === undefined ? 0 : _x;
        var y = _y === undefined ? 0 : _y;
        var iterations = 0;
        var escapedAt = 0;
        var xSquared = 0;
        var ySquared = 0;
        var xSquaredPlusYSquared = 0;

        while (_noOfIterations > 0) {
            xSquared = x * x;
            ySquared = y * y;
            xSquaredPlusYSquared = xSquared + ySquared;

            if(escapedAt === 0 && xSquaredPlusYSquared > _escapeTest) {
                escapedAt = iterations;
                break;
            }

            iterations++;
            y = ((x * y) *2 ) + _my;
            x = xSquared - ySquared + _mx;
            _noOfIterations-=1;
        }
        return pixelResult(x, y, _startIteration + iterations, escapedAt === 0 ? 0 : _startIteration + escapedAt);
    };

    return {
        calculate : calculate
    };
};