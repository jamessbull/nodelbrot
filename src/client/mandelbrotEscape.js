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
                    pal = jim.palette.create(histogram),
                    black = colour(0, 0, 0, 255),
                    initialiseState = function () {
                        return jim.common.grid.create(sizeX, sizeY, function (x, y) {
                            return {
                                coord: screen.at(x, y).translateTo(currentExtents),
                                calc: { iterations: 0, x: 0, y: 0, counted: false },
                                colour: jim.colour.create(0, 0, 0, 255),
                                escaped: false
                            };
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
                            if (!point.calc.counted) {
                                point.calc.counted = true;
                                histogram.add(point.calc.iterations);
                            }
                            point.colour = pal.colourAt(histogram.numberEscapedBy(point.calc.iterations), histogram.total());
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
        },
        escape: {
            create: function () {
                return {
                    calculate: function (mbCoord, state) {
                        var x = state.calc.x,
                            y = state.calc.y,
                            escaped =  (x * x + y * y) > 4,
                            tempX = 0;
                        if (!escaped) {
                            tempX = x * x - y * y + mbCoord.x;
                            state.calc.y = 2 * x * y + mbCoord.y;
                            state.calc.x = tempX;
                            state.calc.iterations += 1;
                        } else {
                            state.escaped = true;
                        }
                    },
                    attempt: function (state, times) {
                        var i;
                        for (i = times; i > 0; i -= 1) {
                            if (state.escaped) {
                                return;
                            }
                            this.calculate(state.coord, state);
                        }
                    }
                };
            }
        }
    };
}());