var mandelbrot = (function () {
    "use strict";
    return {
        set: {
            create: function (initialState, escape, pal) {
                var currentState = initialState;
                var drawFunc = function (x, y) {
                        var colour, myState = currentState[x][y];
                        for ( var i = 0; i < 10; i += 1) {

                        if (myState.calc.escaped) {
                            colour = pal.intoColours(myState.calc);
                        } else {
                            escape.calculate(myState.coord, myState.calc);
                            colour = {red: 0, green: 0, blue: 0, alpha: 255};
                        }}
                        return colour;

                    };
                return {
                    drawFunc: drawFunc,
                    setState: function (state) {
                        currentState = state;
                    }
                }
            }
        },
        state: {
            create: function (sizeX, sizeY , coordFunc) {
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
            create: function (originSizeX, originSizeY, targetStartX, targetEndX, targetStartY, targetEndY) {
                var targetXStart = targetStartX;
                var targetXEnd = targetEndX;
                var targetYStart = targetStartY;
                var targetYEnd = targetEndY;

                var coordFunc = function (originX, originY) {

                    var setXSize = Math.abs(targetXEnd - targetXStart);
                    var setYSize = Math.abs(targetYEnd - targetYStart);

                    var xPos = ((setXSize / originSizeX) * originX) + targetXStart;
                    var yPos = ((setYSize / originSizeY) * originY) + targetYStart;

                    return mandelbrot.coord.create(xPos, yPos);
                };
                return {
                    func: coordFunc,
                    zoomTo: function (selection) {
                        var start = coordFunc(selection.startX, selection.startY);
                        var end = coordFunc(selection.endX, selection.endY);
                        targetXStart = start.x;
                        targetYStart = start.y;
                        targetXEnd = end.x;
                        targetYEnd = end.y;
                        console.log("xStart is now " + targetXStart);
                    }
                }
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
                        length = 0,
                        colour = function (r, g, b, a) {
                            return {red: r, green: g, blue: b, alpha: a};
                        };
                    palette.push(colour(0,   0,   0,   255));
                    palette.push(colour(255,   10,   10,   255));
                    palette.push(colour(255,   15,   15,   255));
                    palette.push(colour(255,   20,   20,   255));
                    palette.push(colour(255,   25,   25,   255));
                    palette.push(colour(255,   30,   30,   255));
                    palette.push(colour(255,   35,   35,   255));
                    palette.push(colour(255,   40,   40,   255));
                    palette.push(colour(255,   45,   45,   255));
                    palette.push(colour(255,   50,   50,   255));
                    palette.push(colour(255,   55,   55,   255));
                    palette.push(colour(255,   60,   60,   255));
                    palette.push(colour(255,   65,   65,   255));
                    palette.push(colour(255,   70,   70,   255));
                    palette.push(colour(255,   75,   75,   255));
                    palette.push(colour(255,   80,   80,   255));
                    palette.push(colour(255,   85,   85,   255));
                    palette.push(colour(255,   90,   90,   255));
                    palette.push(colour(255,   95,   95,   255));
                    palette.push(colour(255,   100,   100,   255));
                    palette.push(colour(255,   105,   105,   255));
                    palette.push(colour(255,   110,   110,   255));
                    palette.push(colour(255,   115,   115,   255));
                    palette.push(colour(255,   120,   120,   255));
                    palette.push(colour(255,   125,   125,   255));
                    palette.push(colour(255,   130,   130,   255));
                    palette.push(colour(255,   135,   135,   255));
                    palette.push(colour(255,   140,   140,   255));
                    palette.push(colour(255,   145,   145,   255));
                    palette.push(colour(255,   150,   150,   255));
                    palette.push(colour(255,   155,   155,   255));
                    palette.push(colour(255,   160,   160,   255));
                    palette.push(colour(255,   165,   165,   255));
                    palette.push(colour(255,   170,   170,   255));
                    palette.push(colour(255,   175,   175,   255));
                    palette.push(colour(255,   180,   180,   255));
                    palette.push(colour(255,   185,   185,   255));
                    palette.push(colour(255,   190,   190,   255));
                    palette.push(colour(255,   195,   195,   255));
                    palette.push(colour(255,   200,   200,   255));
                    palette.push(colour(255,   205,   205,   255));
                    palette.push(colour(255,   210,   210,   255));
                    palette.push(colour(255,   215,   215,   255));
                    palette.push(colour(255,   220,   220,   255));
                    palette.push(colour(255,   225,   225,   255));
                    palette.push(colour(255,   230,   230,   255));
                    palette.push(colour(255,   235,   235,   255));
                    palette.push(colour(255,   240,   240,   255));
                    palette.push(colour(255,   245,   245,   255));
                    palette.push(colour(255,   250,   250,   255));
                    palette.push(colour(255,   255,   255,   255));

                    length = palette.length;
                    palette.intoColours = function (number) {
                        return palette[number.iterations % length];
                    };

                    return palette;
                }
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
                    }
                };
            }
        }
    };
}());

