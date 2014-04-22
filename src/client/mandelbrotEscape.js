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
                        return numbers.map(function (number) {
                            var colour = palette[number % palette.length];
                            return colour;
                        });
                    };

                    return palette;
                }
            }
        },
        createSet: function (points) {
            var escape = mandelbrot.escape.create(),
                pointFunCreator = mandelbrot.pointFunctionCreator.create(escape),
                setFunCreator = mandelbrot.setFunctionCreator.create(pointFunCreator);
            return setFunCreator.functionFor(points);
        },
        setFunctionCreator: {
            create: function (pointFunctionGenerator) {
                return {
                    functionFor: function (coords) {
                        var pointFuncs = coords.map(function (coord) {
                            return pointFunctionGenerator.functionFor(coord);
                        });
                        return function () {
                            return pointFuncs.map(function (func) { return func(); });
                        };
                    }
                };
            }
        },
        pointFunctionCreator: {
            create: function (escape) {
                return {
                    functionFor: function (mandelbrotCoord) {
                        var count = 1,
                            lastResult = escape.calculate(mandelbrotCoord, {x: 0, y: 0});
                        return function () {
                            if (!lastResult.escaped) {
                                count += 1;
                                lastResult = escape.calculate(mandelbrotCoord, lastResult);
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
                        var x = initial.x * initial.x - initial.y * initial.y + mandelbrotCoord.x,
                            y = 2 * initial.x * initial.y + mandelbrotCoord.y;
                        return { x: x, y: y, escaped: (x * x + y * y) > (2 * 2) };
                    }
                };
            }
        }
    };
}());

