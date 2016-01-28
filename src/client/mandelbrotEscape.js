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
                    histogram.add(this.escapedAt);
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
            if ((this.squaresSum()) < 65536 && this.iterations < 10000)
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
        black: jim.colour.create(0, 0, 0, 255)
    };
};

namespace("jim.mandelbrot.state");
jim.mandelbrot.state.create = function (sizeX, sizeY) {
    "use strict";
    var aRectangle      = jim.rectangle.create,
        aGrid           = jim.common.grid.create,
        aPoint          = jim.mandelbrot.point.create,
        timer           = jim.stopwatch.create(),

        currentExtents  = aRectangle(-2.5, -1, 3.5, 2),
        previousExtents = [],
        screen          = aRectangle(0, 0, sizeX - 1, sizeY - 1),
        histogram       = jim.histogram.create(),
        colours         = jim.colourCalculator.create(jim.palette.create()),

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
            histogram.rebuild(grid);

        },
        drawFunc: function (x, y) {
            return grid.at(x, y).calculateCurrentColour(50, histogram, colours);
        },
        histogram: function () {
            return histogram;
        },
        palette: function () {
            return colours;
        },
        at: function (x, y) { return grid.at(x, y);}
    };
};