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
});
