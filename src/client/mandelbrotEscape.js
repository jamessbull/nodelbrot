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
                            coord: coordFunc(jim.coord.create(xPos, yPos)),
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
                var currentSet = jim.rectangle.create(-2.5, -1, 3.5, 2),
                    screen = jim.rectangle.create(0, 0, originSizeX - 1, originSizeY - 1);
                return {
                    func: function (coord) {
                        return screen.at(coord).translateTo(currentSet);
                    },
                    zoomTo: function (selection) {
                        var tl = this.func(selection.area().topLeft()),
                            br = this.func(selection.area().bottomRight());
                        currentSet = jim.rectangle.create(tl, tl.distanceTo(br));

                    }
                };
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