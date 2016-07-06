describe("Dead Regions", function () {
    "use strict";

    it(" should show a pixel should be calced when that pixel has escaped", function () {
        var pixelEscapedValues = [
            true, true,
            true, true
        ];
        var width = 2;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues);
        var doNotCalc = dead.regions();
        expect(doNotCalc[0]).toBe(true);
        expect(doNotCalc[1]).toBe(true);
        expect(doNotCalc[2]).toBe(true);
        expect(doNotCalc[3]).toBe(true);
    });
});