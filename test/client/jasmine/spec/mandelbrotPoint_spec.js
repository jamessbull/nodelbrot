describe("main cardioid and period-2 bulb check", function () {
    "use strict";
    var point = jim.newMandelbrotPoint.create();

    function escapes(mx, my, maxIterations) {
        var result = point.calculate(mx, my, maxIterations, 0, 0, 0, 0);
        return result.histogramEscapedAt !== 0;
    }

    it("should include points inside the main cardioid", function () {
        expect(point.inMainCardioidOrBulb(0, 0)).toBe(true);
        expect(point.inMainCardioidOrBulb(-0.1, 0.1)).toBe(true);
        expect(point.inMainCardioidOrBulb(0.2, 0)).toBe(true);
    });

    it("should include points inside the period-2 bulb", function () {
        expect(point.inMainCardioidOrBulb(-1, 0)).toBe(true);
        expect(point.inMainCardioidOrBulb(-1.2, 0.1)).toBe(true);
    });

    it("should exclude points outside the set", function () {
        expect(point.inMainCardioidOrBulb(0.3, 0)).toBe(false);
        expect(point.inMainCardioidOrBulb(-2.1, 0)).toBe(false);
        expect(point.inMainCardioidOrBulb(0, 1.1)).toBe(false);
        expect(point.inMainCardioidOrBulb(-0.75, 0.2)).toBe(false);
    });

    it("should never include a point that escapes", function () {
        var falsePositives = 0;
        for (var j = 0; j <= 100; j += 1) {
            for (var i = 0; i <= 175; i += 1) {
                var mx = -2.5 + (i * 0.02);
                var my = -1 + (j * 0.02);
                if (point.inMainCardioidOrBulb(mx, my) && escapes(mx, my, 1000)) {
                    falsePositives += 1;
                }
            }
        }
        expect(falsePositives).toBe(0);
    });
});
