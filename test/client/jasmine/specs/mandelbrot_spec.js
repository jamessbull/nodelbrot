describe("The mandelbrot set", function () {
    "use strict";
    it("escape object should calculate the next escape series value", function () {
        var mandelbrotCoord = {x: -2.5, y: -1},
            escape = mandelbrot.escape.create(),
            result;

        result = escape.calculate(mandelbrotCoord, {x: 0, y: 0});
        expect(result.x).toBe(-2.5);
        expect(result.y).toBe(-1);
        expect(result.escaped).toBeTruthy();

        result = escape.calculate(mandelbrotCoord, {x: result.x, y: result.y});
        expect(result.x).toBe(2.75);
        expect(result.y).toBe(4);
        console.log("escape is " + result.escaped);
        expect(result.escaped).toBeTruthy();
    });
    it("should call the escape object until it reaches max val", function () {
        var count = 0,
            escape = {
                calculate: function () {
                    count += 1;
                    return { x: 1, y: 2, escaped: false };
                }
            },
            mandelbrotCoord = {x: 1, y: 2},
            mandelbrotCalculator = mandelbrot.valueCalculator.create(escape);
        mandelbrotCalculator.value(mandelbrotCoord, 5);
        expect(count).toBe(5);
        count = 0;
        mandelbrotCalculator.value(mandelbrotCoord, 6);
        expect(count).toBe(6);
    });

    it("should call the escape object until it escapes", function () {
        var count = 0,
            escape = {
                calculate: function () {
                    count += 1;
                    return { x: 1, y: 2, escaped: count >= 5 };
                }
            },
            mandelbrotCoord = {x: 1, y: 2},
            mandelbrotCalculator = mandelbrot.valueCalculator.create(escape);

        mandelbrotCalculator.value(mandelbrotCoord, 10);
        expect(count).toBe(5);
    });
    it("should pass the return value back into the escape function", function () {
        var count = 0,
            escapeVal = {x: 0, y: 0},
            escape = {
                calculate: function (mandelbrotCoord, escapeValue) {
                    escapeVal = escapeValue;
                    count += 1;
                    return { x: 10, y: 10, escaped: count === 2 };
                }
            },
            mandelbrotCoord = {x: 1, y: 2},
            mandelbrotCalculator = mandelbrot.valueCalculator.create(escape);

        mandelbrotCalculator.value(mandelbrotCoord, 10);
        expect(escapeVal.x).toBe(10);
        expect(escapeVal.y).toBe(10);
    });
    it("should return the number of iterations, and whether it escapes or not", function () {
        var count = 0,
            mandelbrotCalculator = mandelbrot.valueCalculator.create(),
            result;
        result = mandelbrotCalculator.value({x: -2.5, y: -1});
        expect(result.iterations).toBe(1);
        expect(result.escaped).toBe(true);
    });
    it("should pin iterations to the iteration value at which it first escaped", function () {
        var count = 0,
            escape = {
                calculate: function () {
                    count += 1;
                    return { x: 1, y: 1, escaped: count === 3 };
                }
            },
            mandelbrotCalculator = mandelbrot.valueCalculator.create(escape),
            mandelbrotFunction = mandelbrotCalculator.functionFor({x: -2.5, y: -1}),
            result;

        result = mandelbrotFunction();
        expect(result.iterations).toBe(2);

        result = mandelbrotFunction();
        expect(result.iterations).toBe(3);

        result = mandelbrotFunction();
        expect(result.iterations).toBe(3);

        result = mandelbrotFunction();
        expect(result.iterations).toBe(3);

        result = mandelbrotFunction();
        expect(result.iterations).toBe(3);
    });
    it("should take a list of mandelbrotCoords and return a list of the next iterations worth every time", function () {
        var count = 0,
            mandelFunc = function () {
                var count = 0;
                return function () {
                    count += 1;
                    return {iterations: count};
                };
            },
            mandelCalc = {
                functionFor: function (coord) { return mandelFunc(); }
            },
            mandelList = mandelbrot.listCalculator.create(mandelCalc),
            mandelListFunc = mandelList.forPoints([{x: 0.1, y: 0.2}, {x: 0.3, y: 0.4}, {x: 0.5, y: 0.6}]),
            result,
            verify = function (result, timesCalled) {
                expect(result.length).toBe(3);
                expect(result[0].iterations).toBe(timesCalled);
                expect(result[1].iterations).toBe(timesCalled);
                expect(result[2].iterations).toBe(timesCalled);
            };

        result = mandelListFunc();
        verify(result, 1);

        result = mandelListFunc();
        verify(result, 2);

        result = mandelListFunc();
        verify(result, 3);
    });
    it("should create a colour pallette", function () {
        var pal = mandelbrot.colour.palette.create();
        expect(pal.length).toBe(5);

        expect(pal[0].red).toBe(0);
        expect(pal[0].green).toBe(0);
        expect(pal[0].blue).toBe(0);
        expect(pal[0].alpha).toBe(255);

        expect(pal[1].red).toBe(255);
        expect(pal[1].green).toBe(0);
        expect(pal[1].blue).toBe(0);
        expect(pal[1].alpha).toBe(255);

        expect(pal[2].red).toBe(0);
        expect(pal[2].green).toBe(255);
        expect(pal[2].blue).toBe(0);
        expect(pal[2].alpha).toBe(255);

        expect(pal[3].red).toBe(0);
        expect(pal[3].green).toBe(0);
        expect(pal[3].blue).toBe(255);
        expect(pal[3].alpha).toBe(255);

        expect(pal[4].red).toBe(255);
        expect(pal[4].green).toBe(255);
        expect(pal[4].blue).toBe(255);
        expect(pal[4].alpha).toBe(255);
    });

    it("should take a palette and trans form iterations to colours", function () {
        var mandelbrotPalette = mandelbrot.colour.palette.create(),
            mandelbrotColours;
        console.log("Hey!");
        mandelbrotColours = mandelbrotPalette.intoColours([0, 2, 11]);
        expect(mandelbrotColours.length).toBe(3);

        expect(mandelbrotColours[0].red).toBe(0);
        expect(mandelbrotColours[0].green).toBe(0);
        expect(mandelbrotColours[0].blue).toBe(0);

        expect(mandelbrotColours[1].red).toBe(0);
        expect(mandelbrotColours[1].green).toBe(255);
        expect(mandelbrotColours[1].blue).toBe(0);

        expect(mandelbrotColours[2].red).toBe(255);
        expect(mandelbrotColours[2].green).toBe(0);
        expect(mandelbrotColours[2].blue).toBe(0);
    });
});
