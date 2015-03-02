namespace("jim.mandelbrot");
jim.mandelbrot = (function () {
    "use strict";
    var colour = jim.colour.create;
    return {
        set: {
            create: function (initialState, escape, pal) {
                var currentState = initialState, i = 0,
                    black = colour(0, 0, 0, 255),
                    drawFunc = function (x, y) {
                        var myState = currentState[x][y];
                        escape.attempt(myState, 50);
                        if (myState.calc.escaped) {
                            return pal.colourAt(myState.calc);
                        }
                        return black;
                    };
                return {
                    drawFunc: drawFunc,
                    setState: function (state) { currentState = state; }
                };
            }
        },
        state : {
            create: function (sizeX, sizeY, coordFunc) {
                var state = [],
                    yPos = 0,
                    xPos = 0;

                for (yPos; yPos < sizeY; yPos += 1) {
                    for (xPos; xPos < sizeX; xPos += 1) {
                        if (!state[xPos]) { state.push([]); }
                        state[xPos][yPos] = {
                            coord: coordFunc(xPos, yPos),
                            calc: { iterations: 0, escaped: false, x: 0, y: 0 }
                        };
                    }
                    xPos = 0;
                }
                return state;
            }
        },
        coordTranslator: {
            create: function (originSizeX, originSizeY) {
                var extents = jim.mandelbrot.extents.create(),
                    coordFunc = function (originX, originY) {
                        return jim.mandelbrot.coord.create(
                            ((extents.width()  * originX) / (originSizeX - 1)) + extents.topLeft.x,
                            ((extents.height() * originY) / (originSizeY - 1)) + extents.bottomRight.y
                        );
                    };
                return {
                    func: coordFunc,
                    zoomTo: function (selection) {
                        extents.topLeft = coordFunc(selection.startX, selection.startY + selection.height());
                        extents.bottomRight = coordFunc(selection.startX + selection.width(), selection.startY);
                    }
                };
            }
        },
        coord: {
            create: function (x, y) {
                return {x: x, y: y};
            }
        },
        escape: {
            create: function (notifier) {
                return {
                    calculate: function (mbCoord, state) {
                        var x = state.x,
                            y = state.y,
                            escaped =  (x * x + y * y) > 4,
                            tempX = 0;
                        if (!escaped) {
                            tempX = x * x - y * y + mbCoord.x;
                            state.y = 2 * x * y + mbCoord.y;
                            state.x = tempX;
                            state.iterations += 1;
                        } else {
                            state.escaped = true;
                            notifier.notify();
                        }
                    },
                    attempt: function (state, times) {
                        var i;
                        for (i = times; i > 0; i -= 1) {
                            if (state.calc.escaped) {
                                return;
                            }
                            this.calculate(state.coord, state.calc);
                        }
                    }
                };
            }
        }
    };
}());

namespace("jim.mandelbrot.extents");
jim.mandelbrot.extents.create = function () {
    "use strict";
    var coord = jim.mandelbrot.coord.create,
        topLeft = coord(-2.5, 1),
        bottomRight = coord(1, -1);
    return {
        topLeft: topLeft,
        bottomRight: bottomRight,
        width: function () {return Math.abs(bottomRight.x - topLeft.x); },
        height: function () {return Math.abs(topLeft.y - bottomRight.y); }
    };
};

