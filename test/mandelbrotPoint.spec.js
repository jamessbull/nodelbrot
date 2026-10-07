import { calculatePoint, inMainCardioidOrBulb } from "../src/client/mandelbrotPoint.js";

describe("main cardioid and period-2 bulb check", function () {

    function escapes(mx, my, maxIterations) {
        const result = calculatePoint(mx, my, maxIterations, 0, 0, 0, 0);
        return result.histogramEscapedAt !== 0;
    }

    it("should include points inside the main cardioid", function () {
        expect(inMainCardioidOrBulb(0, 0)).toBe(true);
        expect(inMainCardioidOrBulb(-0.1, 0.1)).toBe(true);
        expect(inMainCardioidOrBulb(0.2, 0)).toBe(true);
    });

    it("should include points inside the period-2 bulb", function () {
        expect(inMainCardioidOrBulb(-1, 0)).toBe(true);
        expect(inMainCardioidOrBulb(-1.2, 0.1)).toBe(true);
    });

    it("should exclude points outside the set", function () {
        expect(inMainCardioidOrBulb(0.3, 0)).toBe(false);
        expect(inMainCardioidOrBulb(-2.1, 0)).toBe(false);
        expect(inMainCardioidOrBulb(0, 1.1)).toBe(false);
        expect(inMainCardioidOrBulb(-0.75, 0.2)).toBe(false);
    });

    it("should never include a point that escapes", function () {
        let falsePositives = 0;
        for (let j = 0; j <= 100; j += 1) {
            for (let i = 0; i <= 175; i += 1) {
                const mx = -2.5 + (i * 0.02);
                const my = -1 + (j * 0.02);
                if (inMainCardioidOrBulb(mx, my) && escapes(mx, my, 1000)) {
                    falsePositives += 1;
                }
            }
        }
        expect(falsePositives).toBe(0);
    });
});
