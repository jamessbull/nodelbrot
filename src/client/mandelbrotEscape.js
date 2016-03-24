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
        escapedAt:0,
        colour: jim.colour.create(0,0,0,0),
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
                    this.escapedAt = this.iterations;
                    if (histogram) {
                        histogram.add(this.escapedAt);
                    }
                }
            }
        },
        calculateCurrentColour: function (times, histogram, colours) {
            for (this.count = times; this.count > 0; this.count -= 1) {
                if (this.complete) {
                    break;
                }
                this.calculate(histogram);
            }
            this.colour = this.alreadyEscaped ?
                    colours.forPoint(this, histogram) :
                    colours.black;
            return this.colour;
        },
        incomplete: function () {
            if (this.complete)
                return false;
            if ((this.squaresSum()) < 9007199254740991 && this.iterations < 200000)
                return true;
            this.complete = true;
            return false;
        },
        reset: function (coord) {
            this.mx = coord.x;
            this.my = coord.y;
            this.iterations = 0;
            this.x = 0;
            this.y = 0;
            this.complete = false;
            this.alreadyEscaped = false;
            this.escapedAt = 0;
        },
        reset2: function (x, y) {
            this.mx = x;
            this.my = y;
            this.iterations = 0;
            this.x = 0;
            this.y = 0;
            this.complete = false;
            this.alreadyEscaped = false;
            this.escapedAt = 0;
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


namespace("jim.mandelbrot.pointForDisplay");
jim.mandelbrot.pointForDisplay.create = function (x, y, _displayWidth, _displayHeight, _extents, _completeCheck) {
    "use strict";
    var display = jim.rectangle.create(0,0, _displayWidth - 1, _displayHeight -1);
    var mandelbrotCoord = display.at(x,y).translateTo(_extents);
    var mandelbrotPoint = jim.mandelbrot.point.create(mandelbrotCoord);
    var periodicity = jim.mandelbrot.periodicityChecker.create(15);

    //var retVal =


    var create =  function (w, h, disp, coord, point, extents, completeCheck, periodicity) {
        var doneFunc = (function () {
            if (completeCheck) {
                return function (p) {return p.complete;};
            } else {
                return function (p) {return p.alreadyEscaped;};
            }
        }());

        return {
            calculate: function (histogram) {
                mandelbrotPoint.calculate(histogram);
            },
            done: doneFunc,
            displayWidth: w,
            displayHeight: h,
            display: disp,
            mandelbrotCoord: coord,
            mandelbrotPoint: point,
            iterations:0,
            bufferSize: 15,
            timesChecked: 0,
            inOrbit: false,
            periodicityCheckingOn: false,
            extents: extents,
            periodicity: periodicity,
            calculateTo: function (x, y, upTo, histogram, mandelbrotCoord, mandelbrotPoint, done) {
                var timesChecked = 0;
                var iterations = 0;
                //var inOrbit = false;
                //this.mandelbrotCoord = this.display.at(x,y).translateTo(this.extents);
                //var done = this.done;
                //var periodicity = this.periodicity;
                //var periodicityCheckingOn = this.periodicityCheckingOn;
                //mandelbrotPoint.reset(mandelbrotCoord);


                while (!done(mandelbrotPoint) && iterations < upTo) {
                    iterations +=1;
                    mandelbrotPoint.calculate(histogram);
                }
                    //if (periodicityCheckingOn) {
                        //timesChecked ++;
                        //
                    //}
//                    if (timesChecked > 15) {
//                        periodicityCheckingOn = false;
//                    }
   //             }

//                if (iterations >= upTo) {
//                    this.periodicityCheckingOn = true;
//                } else {
//                    this.periodicityCheckingOn = false;
//                }
            }, calculateToEscape: function (x, y, upTo, histogram) {
                this.calculateTo(x, y, upTo, histogram, false);
            },
            calculateToDone: function (x, y, upTo, histogram) {
                this.calculateTo(x, y, upTo, histogram, true);
            },
            underlyingPoint: function () {
                return mandelbrotPoint;
            },
            periodicityIdentifiedCount: function () {
                return periodicity.periodicityIdentifiedCount();
            }
        };
    };

    return create(_displayWidth, _displayHeight, display, mandelbrotCoord, mandelbrotPoint, _extents, _completeCheck, periodicity);
};

namespace("jim.colourCalculator");
jim.colourCalculator.create = function (palette) {
    "use strict";
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

    return {
        forPoint: function (p, histogram) {
            zn = Math.sqrt((p.x * p.x) + (p.y * p.y));
            nu = Math.log(Math.log(zn) /  Math.LN2) / Math.LN2;
            iteration = p.iterations + 1 - nu;
            lowerIteration = Math.floor(iteration - 1);
            higerIteration = Math.floor(iteration);
            fractionalPart = iteration % 1;
            lower = histogram.percentEscapedBy(lowerIteration);
            higher = histogram.percentEscapedBy(higerIteration);
            interpolatedColour = interpolate(lower, higher, fractionalPart);
            return palette.colourAt(interpolatedColour);
        },
        getUsefulNumbersMessage: function (p, histogram) {
            var zn,nu,iteration, lowerIteration, higherIteration, fractionalPart, lower, higher, interpolatedColour;
            zn = Math.sqrt((p.x * p.x) + (p.y * p.y));
            nu = Math.log(Math.log(zn) /  Math.LN2) / Math.LN2;
            iteration = p.iterations + 1 - nu;
            lowerIteration = Math.floor(iteration - 1);
            higerIteration = Math.floor(iteration);
            fractionalPart = iteration % 1;
            lower = histogram.percentEscapedBy(lowerIteration);
            higher = histogram.percentEscapedBy(higerIteration);
            interpolatedColour = jim.interpolator.create().loginterpolate(lower, higher, fractionalPart);

            var c = palette.colourAt(interpolatedColour);
            return "lowerIteration: " + lowerIteration + " <br>higherIteration: "+ higerIteration +" <br>fraction: "+ fractionalPart + " \ninterpolated colour: " + interpolatedColour + "<br>colour calculated (rgb): " + c.r + " " + c.g + " " + c.b;
        },
        black: jim.colour.create(0, 0, 0, 255),
        palette: palette
    };
};

namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY, startingExtent) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        aGrid           = jim.common.grid.create,
        aPoint          = jim.mandelbrot.point.create,
        timer           = jim.stopwatch.create(),

        //currentExtents  = aRectangle(-2.5, -1, 3.5, 2),
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        histogram       = jim.histogram.create(),
        colours         = jim.colourCalculator.create(jim.palette.create()),
        maxIterations   = 0,
        chunkSize      = 25,

        fromScreen = function (x, y) { return screen.at(x, y).translateTo(currentExtents);},
        newGrid = function () {
            return aGrid(sizeX, sizeY, function (x, y) { return aPoint(fromScreen(x, y)); });
        },
        grid = newGrid();

    return {
        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            grid = newGrid();
            histogram.reset();
        },
        resize: function (sizeX, sizeY) {
            screen = aRectangle(0, 0, sizeX - 1, sizeY - 1);
            grid = aGrid(sizeX, sizeY, function (x, y) { return aPoint(fromScreen(x, y)); });
        },
        zoomOut: function () {
            if (previousExtents.length > 0) {
                currentExtents = previousExtents.pop();
            }
            grid = newGrid();
            histogram.reset();

        },
        move: function (moveX, moveY) {
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0- distance.x, 0 -distance.y);
            grid.translate(moveX, moveY);

        },
        drawFunc: function (x, y) {
            var p = grid.at(x, y);
            if (p.iterations > maxIterations) maxIterations = p.iterations;
            return p.calculateCurrentColour(chunkSize, histogram, colours);
        },
        histogram: function () {
            return histogram;
        },
        palette: function () {
            return colours;
        },
        setPalette: function (p) {
            colours.palette = p;
        },
        getExtents: function () {
            return currentExtents;
        },
        setExtents: function (extents) {
            currentExtents = extents;
            grid = newGrid();
        },
        maximumIteration: function () {
            return maxIterations;
        },
        chunksize: function (c) {
            chunkSize = c;
        },
        at: function (x, y) { return grid.at(x, y);}
    };
};