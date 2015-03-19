namespace("jim.mandelbrot");
jim.mandelbrot = (function () {
    "use strict";
    var colour = jim.colour.create;
    return {
        set: {
            create: function (initialState, escape, pal) {
                var currentState = initialState, i = 0,
                    black = colour(0, 0, 0, 255),
                    processState = function (state) {
                        escape.attempt(state, 50);
                        if (state.calc.escaped) {
                            state.colour = pal.colourAt(state.calc);
                            return state.colour;
                        }
                        state.colour = black;
                        return black;
                    },
                    drawFunc = function (x, y) {
                        var myState = currentState.at(x, y);
                        return processState(myState);
                    };
                return {
                    drawFunc: drawFunc,
                    drawAll: function () {
                        currentState.grid.run(processState);
                    },
                    setState: function (state) { currentState = state; }
                };
            }
        },
        state : {
            create: function (sizeX, sizeY) {
                var currentExtents = jim.rectangle.create(-2.5, -1, 3.5, 2),
                    screen = jim.rectangle.create(0, 0, sizeX - 1, sizeY - 1),
                    initialiseState = function () {
                        return jim.common.grid.create(sizeX, sizeY, function (x, y) {
                            return {
                                coord: screen.at(x, y).translateTo(currentExtents),
                                calc: { iterations: 0, escaped: false, x: 0, y: 0 },
                                colour: jim.colour.create(0, 0, 0, 255)
                            };
                        });
                    },
                    grid = initialiseState(),
                    zoom = function (selection) {
                        currentExtents = selection.area().translateFrom(screen).to(currentExtents);
                        grid = initialiseState();
                    };

                return {
                    grid: grid,
                    at: function (x, y) { return grid.at(x, y); },
                    zoomTo: zoom
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

//best way to split set up? new idea draw directly to a number of canvases.
//How do the points get split up. Have multiple canvases all displayed and write to each directly.
//Bit like segments now
// so time is split by how big an image I can render in 1/25 th of a second
//create canvases. each segment has a rect

//  How do I compute the histogram?
// I currently only calculate each pixel as it is required.
// I need to change it so it computes the whole lot.
// How do I know when I've done a frame? I don't care right now.
// Alternatively I could add to the histogram as I do each pixel and colour each pixel every frame

// o.k. Let's try to calc whole array. How long does it take?

//total = 0
//for (i = 0; i < max_iterations; i += 1)
//{
//    total += histogram[i]
//}
//
//hue = 0.0;
//for (i = 0; i < iteration; i += 1)
//{
//    hue += histogram[i] / total // Must be floating-point division.
//}
//
//color = palette[hue]