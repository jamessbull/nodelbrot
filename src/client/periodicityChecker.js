namespace("jim.mandelbrot.periodicityChecker");
jim.mandelbrot.periodicityChecker.create = function (_size) {
    "use strict";
    var ex = [];
    var wy = [];

    for(var i = 0 ; i < _size ; i += 1) {
        ex[i] = 0;
        wy[i] = 0;
    }

    var count = 0;
    var currentPosition = 0;
    var contains = function (x,y) {
        for (var i = 0 ; i < _size; i += 1) {
            if (x === ex[i] && y === wy[i]) return true;
        }
        return false;
    };
    var checkPeriodicity = function (x, y) {
        if (contains(x,y)) {
            count +=1;
            return true;
        }
        ex[currentPosition] = x;
        wy[currentPosition] = y;
        currentPosition ++;
        if(currentPosition >= _size) {
            currentPosition = 0;
        }
    };

    return {
        checkPeriodicity: checkPeriodicity,
        periodicityIdentifiedCount: function () {
            return count;
        }
    };
};