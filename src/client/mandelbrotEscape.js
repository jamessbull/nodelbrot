namespace("jim.mandelbrot");
jim.mandelbrot = (function () {
    "use strict";
    var colour = jim.colour.create;
    return {
        state : {
            create: function (sizeX, sizeY) {
                var currentExtents = jim.rectangle.create(-2.5, -1, 3.5, 2),
                    screen = jim.rectangle.create(0, 0, sizeX - 1, sizeY - 1),
                    histogram = jim.histogram.create(),
                    pal = jim.palette.create(),
                    colours = jim.colourCalculator.create(pal),
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
                        var point = grid.at(x, y);
                        point.batchCalculate(50, histogram);
                        if (!point.alreadyEscaped) {
                            return black;
                        }
                        return colours.forPoint(point, histogram);
                    };

                return {
                    grid: grid,
                    zoomTo: zoom,
                    drawFunc: processState
                };
            }
        }
    };
}());

namespace("jim.mandelbrot.basepoint");
jim.mandelbrot.basepoint = (function () {
    "use strict";
    return {
        mx: 0,
        count: 0,
        tempX: 0,
        my: 0,
        x: 0,
        y: 0,
        complete: false,
        alreadyEscaped: false,
        iterations: 0,
        squaresSum: function () {
            return this.x * this.x + this.y * this.y;
        },
        calculate: function (histogram) {
            if (this.incomplete()) {
                this.tempX = this.x * this.x - this.y * this.y + this.mx;
                this.y = 2 * this.x * this.y + this.my;
                this.x = this.tempX;
                this.iterations += 1;
                if (!this.alreadyEscaped && this.squaresSum() > 4) {
                    this.alreadyEscaped = true;
                    histogram.add(this.iterations);
                }
            }
        },
        batchCalculate: function (times, histogram) {
            for (this.count = times; this.count > 0; this.count -= 1) {
                if (this.complete) {
                    break;
                }
                this.calculate(histogram);
            }
        },
        incomplete: function () {
            if (this.complete) {
                return false;
            }
            if ((this.squaresSum()) < 65536 && this.iterations < 10000) {
                return true;
            }
            this.complete = true;
            return false;
        }
    };
}());

namespace("jim.mandelbrot.point");
jim.mandelbrot.point.create = function (coord) {
    "use strict";
    var point = Object.create(jim.mandelbrot.basepoint);
    point.mx = coord.x;
    point.my = coord.y;
    return point;
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
                lower,
                higher,
                fractionalPart,
                iteration,
                interpolatedColour,
                interpolate = jim.interpolator.create().interpolate;

            zn = Math.sqrt((p.x * p.x) + (p.y * p.y));
            nu = Math.log(Math.log(zn) / Math.log(2)) / Math.log(2);
            iteration = p.iterations + 1 - nu;
            lowerIteration = Math.floor(iteration - 1);
            higerIteration = Math.floor(iteration);
            fractionalPart = iteration % 1;
            lower = histogram.percentEscapedBy(lowerIteration);
            higher = histogram.percentEscapedBy(higerIteration);
            interpolatedColour = interpolate(lower, higher, fractionalPart);
            return palette.colourAt(interpolatedColour);
        }
    };
};