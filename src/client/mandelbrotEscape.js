var mandelbrot = (function () {
    "use strict";
    return {
        set: {
            create: function (state, escape, pal) {
                var drawFunc = function (x, y) {
                        var colour;
                        escape.calculate(state[x][y].coord, state[x][y].calc);
                        if (state[x][y].calc.escaped) {
                            colour = pal.intoColours([state[x][y].calc])[0];
                        } else {
                            colour = {red: 0, green: 0, blue: 0, alpha: 255};
                        }
                        return colour;
                    };
                return drawFunc;
            }
        },
        state: {
            create: function (size, coordFunc) {
                var state = [],
                    i = 0,
                    j = 0;

                for (i; i < size; i += 1) {
                    for (j; j < size; j += 1) {
                        if (!state[i]) { state.push([]); }
                        state[i][j] = {
                            coord: coordFunc(i, j),
                            calc: { iterations: 0, escaped: false, x: 0, y: 0 }
                        };
                    }
                    j = 0;
                }
                return state;
            }
        },
        coordTranslator: {
            create: function (size) {
                return function (x, y) {
                    return mandelbrot.coord.create(((3.5  * x) / (size - 1)) - 2.5, ((2 * y) / (size - 1)) - 1);
                };
            }
        },
        coord: {
            create: function (x, y) {
                return {x: x, y: y};
            }
        },
        xyIterator: {
            create: function (x, y, w, h) {
                var currentX = x,
                    currentY = y,
                    newCoord;

                return {
                    next: function () {
                        newCoord = mandelbrot.coord.create(currentX, currentY);
                        currentX += 1;
                        if (currentX >= x + w) {
                            currentX = x;
                            currentY += 1;
                        }
                        if (currentY >= y + h) {
                            currentX = x;
                            currentY = y;
                        }
                        return newCoord;
                    }
                };
            }
        },
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
                            var colour = palette[number.iterations % palette.length];
                            return colour;
                        });
                    };

                    return palette;
                }
            }
        },
        escape: {
            create: function () {
                return {
                    calculate: function (mbCoord, state) {
                        var escaped =  (state.x * state.x + state.y * state.y) > (2 * 2),
                            tempX = 0;
                        if (!escaped) {
                            tempX = state.x * state.x - state.y * state.y + mbCoord.x;
                            state.y = 2 * state.x * state.y + mbCoord.y;
                            state.x = tempX;
                            state.iterations += 1;
                        } else {
                            state.escaped = true;
                        }
                    }
                };
            }
        }
    };
}());

