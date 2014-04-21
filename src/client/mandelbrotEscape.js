var mandelbrot = (function () {
    "use strict";
    return {
        valueCalculator: {
            create: function (escape) {
                var myEscape;
                if (escape) {
                    myEscape = escape;
                } else {
                    myEscape = mandelbrot.escape.create();
                }
                return {
                    value: function (mandelbrotCoord, maxIterations) {
                        var count = 1,
                            initial = {x: 0, y: 0},
                            lastResult = myEscape.calculate(mandelbrotCoord, initial);
                        while (count < maxIterations && !lastResult.escaped) {
                            lastResult = myEscape.calculate(mandelbrotCoord, lastResult);
                            count += 1;
                        }
                        return {
                            iterations: count,
                            escaped: lastResult.escaped
                        };
                    },
                    functionFor: function (mandelbrotCoord) {
                        var count = 1,
                            lastResult = myEscape.calculate(mandelbrotCoord, {x: 0, y: 0});
                        return function () {
                            if (!lastResult.escaped) {
                                count += 1;
                                lastResult = myEscape.calculate(mandelbrotCoord, lastResult);
                            }
                            return {iterations: count};
                        };
                    }
                };
            }
        },
        escape: {
            create: function () {
                return {
                    calculate: function (mandelbrotCoord, initial) {
                        var tempX,
                            x,
                            y,
                            escaped;

                        tempX = initial.x * initial.x - initial.y * initial.y + mandelbrotCoord.x;
                        y = 2 * initial.x * initial.y + mandelbrotCoord.y;
                        x = tempX;
                        escaped = (x * x + y * y) > (2 * 2);
                        return {
                            x: x,
                            y: y,
                            escaped: escaped
                        };
                    }
                };
            }
        }
    };
}());

