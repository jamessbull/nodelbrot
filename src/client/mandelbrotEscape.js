var mandelbrot = (function () {
    "use strict";
    return {
        colour: {
            palette: {
                create: function () {
                    var palette = [],
                        colour = function (r, g, b, a) {
                            return {red: r, green: g, blue: b, alpha: a};
                        };
                    palette.push(colour(0,   0,   0,   255));
                    palette.push(colour(255, 0,   0,   255));
                    palette.push(colour(0,   255, 0,   255));
                    palette.push(colour(0,   0,   255, 255));
                    palette.push(colour(255, 255, 255, 255));

                    palette.intoColours = function (numbers) {
                        console.log("Hello!!!!");
                        return numbers.map(function (number) {
                            var colour = palette[number % palette.length];
                            console.log("Palette size " + palette.length + " number " + number);
                            console.log("colour is " + colour);
                            return colour;
                        });
                    };

                    return palette;
                }
            }
        },
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
        listCalculator: {
            create: function (mandelCalc) {
                return {
                    forPoints: function (mandelCoords) {
                        var mandelFuncs = mandelCoords.map(function (coord) {
                            return mandelCalc.functionFor(coord);
                        });
                        return function () {
                            return mandelFuncs.map(function (func) {
                                return func();
                            });
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

