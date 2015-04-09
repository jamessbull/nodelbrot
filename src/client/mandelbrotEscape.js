namespace("jim.mandelbrot");
jim.mandelbrot = (function () {
    "use strict";
    var colour = jim.colour.create;
    return {
        set: {
            create: function (initialState) {
                var currentState = initialState,
                    drawFunc = function (x, y) {
                        return currentState.processState(x, y);
                    };
                return {
                    drawFunc: drawFunc,
                    drawAll: function () {
                        currentState.grid.run(processState);
                    }
                };
            }
        },
        state : {
            create: function (sizeX, sizeY) {
                var currentExtents = jim.rectangle.create(-2.5, -1, 3.5, 2),
                    screen = jim.rectangle.create(0, 0, sizeX - 1, sizeY - 1),
                    escape = jim.mandelbrot.escape.create(),
                    histogram = jim.histogram.create(),
                    pal = jim.palette.create(),
                    black = colour(0, 0, 0, 255),
                    initialiseState = function () {
                        return jim.common.grid.create(sizeX, sizeY, function (x, y) {
                            return jim.mandelbrot.point.create(screen.at(x, y).translateTo(currentExtents));
                        });
                    },
                    grid = initialiseState(),
                    zoom = function (selection) {
                        currentExtents = selection.area().translateFrom(screen).to(currentExtents);
                        grid = initialiseState();
                        histogram.reset();
                    },
                    processState = function (x, y) {
                        var point = this.at(x, y);
                        escape.attempt(point, 50);
                        if (point.escaped) {
                            if (!point.counted) {
                                point.counted = true;
                                histogram.add(point.iterations);
                            }
                            point.colour = pal.colourAt(histogram.percentEscapedBy(point.iterations));
                            return point.colour;
                        }
                        point.colour = black;
                        return black;
                    };

                return {
                    grid: grid,
                    at: function (x, y) { return grid.at(x, y); },
                    zoomTo: zoom,
                    processState: processState
                };
            }
        }
    };
}());

namespace("jim.mandelbrot.escape");
jim.mandelbrot.escape.create = function () {
    "use strict";
    return {
        calculate: function (point) {
            var x = point.x,
                y = point.y,
                escaped =  (x * x + y * y) > 4,
                tempX = 0;
            if (!escaped) {
                tempX = x * x - y * y + point.coord.x;
                point.y = 2 * x * y + point.coord.y;
                point.x = tempX;
                point.iterations += 1;
            } else {
                point.escaped = true;
            }
        },
        attempt: function (point, times) {
            var i;
            for (i = times; i > 0; i -= 1) {
                if (point.escaped) {
                    return;
                }
                this.calculate(point);
            }
        }
    };
};

namespace("jim.mandelbrot.point");
jim.mandelbrot.point.create = function (coord) {
    "use strict";
    return {
        coord: coord,
        iterations: 0,
        x: 0,
        y: 0,
        counted: false,
        escaped: false
    };
};

namespace("jim.colourCalculator");
jim.colourCalculator.create = function (palette) {
    "use strict";
    return {
        forPoint: function (p, histogram) {
            var zn,
                nu,
                lowerIteration,
                higerIteration,
                fractionalPart,
                iteration,
                interpolate = jim.interpolator.create().interpolate;

            p.iterations = 5;
            p.x = 3.5;
            p.y = 3;
            zn = Math.sqrt((p.x * p.x) + (p.y * p.y));
            nu = Math.log(Math.log(zn) / Math.log(2)) / Math.log(2);
            iteration = p.iterations + 1 - nu;
            lowerIteration = Math.floor(iteration - 1);
            higerIteration = Math.floor(iteration);
            fractionalPart = iteration % 1;
            return palette.colourAt(interpolate(histogram.percentEscapedBy(lowerIteration), histogram.percentEscapedBy(higerIteration), fractionalPart));
        }
    };
};