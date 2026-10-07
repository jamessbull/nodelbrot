import { interpolate, round } from "../src/client/math.js";

describe("maths", function () {
    it("linearly interpolates between two numbers", function () {
        expect(interpolate(0, 10, 0.1)).toBe(1);
        expect(interpolate(0, 10, 0.5)).toBe(5);
        expect(interpolate(0, 10, 1.0)).toBe(10);
        expect(interpolate(50, 100, 0.5)).toBe(75);
        expect(interpolate(100, 200, 0.1)).toBe(110);
    });

    it("should round to a specified number of decimal places", function () {
        const x = 1.11111;
        const none = round(x, 0);
        const one = round(x, 1);
        const two = round(x, 2);

        expect(none).toBe(1);
        expect(one).toBe(1.1);
        expect(two).toBe(1.11);
    });
});
