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
            var x = this.x, y = this.y, tempX;
            if (this.incomplete()) {
                tempX = x * x - y * y + this.mx;
                this.y = 2 * x * y + this.my;
                this.x = tempX;
                this.iterations += 1;
                if (!this.alreadyEscaped && (x * x + y * y) > 4) {
                    this.alreadyEscaped = true;
                    this.escapedAt = this.iterations;
                    if (histogram) {
                        histogram.add(this.escapedAt);
                    }
                }
            }
        },
        calculateCurrentColour: function (times, histogram, colours, palette) {
            var x, y , tempX, iterations, mx, my, escaped, escapedAt, colour, squaresum,complete;
            complete   = this.complete;
            escaped    = this.alreadyEscaped;
            escapedAt  = this.escapedAt;
            x          = this.x;
            y          = this.y;
            mx         = this.mx;
            my         = this.my;
            iterations = this.iterations;

            for (; times > 0; times -= 1) {
                if (complete) { break; }
                squaresum = x * x + y * y;
                if (squaresum > 9007199254740991 || iterations >= 250000) {
                    complete = true;
                    break;
                }

                tempX = (x * x) - (y * y) + mx;
                y = 2 * x * y + my;
                x = tempX;
                iterations += 1;
                if (!escaped && (squaresum) > 4) {
                    escaped = true;
                    escapedAt = iterations;
                }
            }

            colour = escaped ? colours.forPoint(x,y, iterations, histogram, palette) : colours.black;

            if (!this.complete) {
                this.x = x;
                this.y = y;
                this.iterations = iterations;
                this.alreadyEscaped = escaped;
                this.escapedAt = escapedAt;
                this.colour = colour;
                this.complete = complete;
            }
            return colour;
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
                while (!done(mandelbrotPoint) && iterations < upTo) {
                    iterations +=1;
                    mandelbrotPoint.calculate(histogram);
                }
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
jim.colourCalculator.create = function () {
    "use strict";
    var interpolate = jim.interpolator.create().interpolate;
    var nu,
        iterationFloor,
        lower,
        higher,
        fractionalPart,
        iteration,
        interpolatedColour;

    var sqrt = Math.sqrt;
    var log = Math.log;
    var LN2 = Math.LN2;
    var floor = Math.floor;
    var pixelCount = 0;
    return {
        forPoint: function (x, y, iterations, histogram, palette) {
            nu = log(log(sqrt((x * x) + (y * y))) /  LN2) / LN2;
            iteration = iterations + 1 - nu;
            iterationFloor = floor(iteration);

            fractionalPart = iteration - iterationFloor;

            lower = histogram.percentEscapedBy(iterationFloor - 1);
            higher = histogram.percentEscapedBy(iterationFloor);

            interpolatedColour = interpolate(lower, higher, fractionalPart);
            return palette.colourAt(interpolatedColour);
        },
        black: jim.colour.create(0, 0, 0, 255)
    };
};

namespace("jim.mandelbrot.webworkerHistogram");
jim.mandelbrot.webworkerHistogram.create = function (_events) {
    "use strict";
    var newWorker = function () {
        return new Worker("/js/histogramCalculatingWorker.js");
    };
    var newEmptyState = jim.mandelbrot.worker.state.create;
    var newJob = jim.parallelHistogramGenerator.message.create;
    var worker;

    var extents = {};
    var maxIterations = 100000;
    var fullHistoData;
    var fullHistoTotal = 0;
    var noOfIterations = 1000;
    var currentPosition = 0;
    var width = 70;
    var height = 40;

    var updateHistoData = function (_data, _start) {
        var hist = jim.twoPhaseHistogram.create(0);
        for (var i = 1 ; i <= noOfIterations ; i+=1) {
            fullHistoData[_start + i] = (fullHistoTotal += _data[i]);
        }
        hist.setData(fullHistoData, fullHistoTotal);
        return hist;
    };

    var myOnMessage = function (e) {
        var updatedHistogram = updateHistoData(new Uint32Array(e.data.result.histogramData), e.data.result.histogramStartIteration);
        _events.fire("histogramUpdateJustIn", updatedHistogram);

        if((currentPosition += noOfIterations) < maxIterations) {
            worker.postMessage(newJob(noOfIterations, width, height, extents, e.data.result.setState, currentPosition));
        }
    };

    var start = function () {
        worker = newWorker();
        worker.onmessage = myOnMessage;
        fullHistoData = new Uint32Array(new ArrayBuffer(4 * maxIterations));
        fullHistoTotal = 0;
        currentPosition = 0;
        worker.postMessage(newJob(noOfIterations, width, height, extents, newEmptyState(height, width), 0));
    };

    var stop = function () {
        if (worker) worker.terminate();
    };

    _events.listenTo("stopConcHistogram", function () {
        stop();
    });

    _events.listenTo("NewHistoRequired", function (_extents) {
        extents = _extents;
        stop();
        start();
    });
};

namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY, startingExtent, _events) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        aGrid           = jim.common.grid.create,
        aPoint          = jim.mandelbrot.point.create,
        timer           = jim.stopwatch.create(),
        palette         = jim.palette.create(),
        //currentExtents  = aRectangle(-2.5, -1, 3.5, 2),
        currentExtents  = startingExtent,
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        histogram       = jim.histogram.create(),
        colours         = jim.colourCalculator.create(),
        maxIterations   = 0,
        chunkSize      = 100,
        p,
        black = jim.colour.create(0,0,0,255),
        fromScreen = function (x, y) { return screen.at(x, y).translateTo(currentExtents);},
        newGrid = function () {
            return aGrid(sizeX, sizeY, function (x, y) { return aPoint(fromScreen(x, y)); });
        },

        grid = newGrid();

        _events.fire("NewHistoRequired", currentExtents);


        var getHistogram = function() {
            return histogram;
        };

    var theState = {
        zoomTo: function (selection) {
            previousExtents.push(currentExtents.copy());
            currentExtents = selection.area().translateFrom(screen).to(currentExtents);
            grid = newGrid();

            maxIterations = 0;
            _events.fire("NewHistoRequired", currentExtents);
            _events.fire("zoomIn");
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
            _events.fire("NewHistoRequired", currentExtents);
            maxIterations = 0;
            _events.fire("zoomOut");
        },
        move: function (moveX, moveY) {
            _events.fire("moved");
            var distance = fromScreen(moveX, moveY).distanceTo(currentExtents.topLeft());
            currentExtents.move(0 - distance.x, 0 - distance.y);
            grid.translate(moveX, moveY);
            //histogram.rebuild(grid);

        },
        drawFunc: function (x, y) {
            p = grid.at(x, y);
            if (p.iterations > maxIterations) maxIterations = p.iterations;
            return p.calculateCurrentColour(chunkSize, getHistogram(), colours, palette);

            //return test;
        },
        histogram: function () {
            return getHistogram();
        },
        setHistogram: function (h) {
            histogram = h;
        },
        palette: function () {
            return palette;
        },
        setPalette: function (p) {
            palette = p;
        },
        getExtents: function () {
            return currentExtents;
        },
        setExtents: function (extents) {
            currentExtents = extents;
            grid = newGrid();
            getHistogram().reset();
            maxIterations = 0;
            _events.fire("moved");
            _events.fire("NewHistoRequired", currentExtents);
        },
        maximumIteration: function () {
            return maxIterations;
        },
        chunksize: function (c) {
            chunkSize = c;
        },
        deadRegions : function (radius) {
            var regions = [];
            grid.iterateVisible(function (p,x, y) {
                if(p) {
                    regions.push(p.alreadyEscaped);
                } else {
                    regions.push(false);
                }
            });
            var deadRegions = jim.mandelbrot.deadRegions.create(regions, sizeX);
            var parsedRadius = parseInt(radius ? radius : 1, 10);
            return  deadRegions.regions(parsedRadius);
        },
        currentPointColour: function (x,y) {
            if(grid.xSize()<=x || grid.ySize()<=y || x<0 || y<0) {
                return jim.colour.create(100,100,100,255);
            }
            var point = grid.at(x,y);

            var escaped = point.alreadyEscaped;
            return escaped ? colours.forPoint(point.x, point.y, point.iterations, getHistogram(), palette):black;
        },
        at: function (x, y) {
            if (grid.xSize()<=x || grid.ySize()<=y || x<0 || y<0) {
                return Object.create(jim.mandelbrot.basepoint);
            }
            return grid.at(x, y);
        }
    };
    _events.listenTo("histogramUpdateJustIn", function (_histogram) {
        theState.setHistogram(_histogram);
    });
    return theState;
};