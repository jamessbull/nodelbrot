describe("Dead Regions", function () {
    "use strict";

    it(" should show a pixel should be calced when that pixel has escaped", function () {
        var pixelEscapedValues = [
            true, true,
            true, true
        ];
        var width = 2;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBe(false);
        expect(doNotCalc[1]).toBe(false);
        expect(doNotCalc[2]).toBe(false);
        expect(doNotCalc[3]).toBe(false);
    });

    it(" should show a pixel should be calced when that pixel has not escaped but a neighbour has", function () {
        var pixelEscapedValues = [
            true, false,
            true, true
        ];
        var width = 2;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBe(false);
        expect(doNotCalc[1]).toBe(false);
        expect(doNotCalc[2]).toBe(false);
        expect(doNotCalc[3]).toBe(false);
    });

    it("if all pixels around a pixel have escaped then it should not be calced", function () {
        var pixelEscapedValues = [
            false, false, false,
            false, false, false,
            false, false, false,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[4]).toBe(true);

    });

    it("pixels at the corners should not be calced if they are surrounded by three unescaped pixels and are not escaped themselves", function () {
        var pixelEscapedValues = [
            false, false, true,
            false, false, true,
            true, true, true,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBe(true);
        expect(doNotCalc[1]).toBe(false);
        expect(doNotCalc[2]).toBe(false);
        expect(doNotCalc[3]).toBe(false);
        expect(doNotCalc[4]).toBe(false);
        expect(doNotCalc[5]).toBe(false);
        expect(doNotCalc[6]).toBe(false);
        expect(doNotCalc[7]).toBe(false);
        expect(doNotCalc[8]).toBe(false);

    });

    it("pixels at the edges should not be calced if they are surrounded by three unescaped pixels and are not escaped themselves", function () {
        var pixelEscapedValues = [
            false, false, true,
            false, false, true,
            false, false, true,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBe(true);
        expect(doNotCalc[1]).toBe(false);
        expect(doNotCalc[2]).toBe(false);
        expect(doNotCalc[3]).toBe(true);
        expect(doNotCalc[4]).toBe(false);
        expect(doNotCalc[5]).toBe(false);
        expect(doNotCalc[6]).toBe(true);
        expect(doNotCalc[7]).toBe(false);
        expect(doNotCalc[8]).toBe(false);

    });

    it("pixels surrounded should not be calced", function () {
        var pixelEscapedValues = [
            false, false, false,
            false, false, false,
            false, false, false,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBe(true);
        expect(doNotCalc[1]).toBe(true);
        expect(doNotCalc[2]).toBe(true);
        expect(doNotCalc[3]).toBe(true);
        expect(doNotCalc[4]).toBe(true);
        expect(doNotCalc[5]).toBe(true);
        expect(doNotCalc[6]).toBe(true);
        expect(doNotCalc[7]).toBe(true);
        expect(doNotCalc[8]).toBe(true);

    });


    it("pixels surrounded should not be calced", function () {
        var pixelEscapedValues = [
            true, true,  true,  true,  true,  true,  true,
            true, false, false, false, false, false, true,
            true, false, false, false, false, false, true,
            true, false, false, false, false, false, true,
            true, false, false, false, false, false, true,
            true, false, false, false, false, false, true,
            true, true,  true,  true,  true,  true,  true,
        ];
        var width = 7;

        var dead = jim.mandelbrot.deadRegions.create(pixelEscapedValues, width);
        var doNotCalc = dead.regions(2);
        expect(doNotCalc[0]).toBe(false);
        expect(doNotCalc[1]).toBe(false);
        expect(doNotCalc[2]).toBe(false);
        expect(doNotCalc[3]).toBe(false);
        expect(doNotCalc[4]).toBe(false);
        expect(doNotCalc[5]).toBe(false);
        expect(doNotCalc[6]).toBe(false);
        expect(doNotCalc[7]).toBe(false);
        expect(doNotCalc[8]).toBe(false);
        expect(doNotCalc[8]).toBe(false);
        expect(doNotCalc[9]).toBe(false);
        expect(doNotCalc[10]).toBe(false);
        expect(doNotCalc[11]).toBe(false);
        expect(doNotCalc[12]).toBe(false);
        expect(doNotCalc[13]).toBe(false);
        expect(doNotCalc[14]).toBe(false);
        expect(doNotCalc[15]).toBe(false);
        expect(doNotCalc[16]).toBe(false);
        expect(doNotCalc[17]).toBe(false);
        expect(doNotCalc[18]).toBe(false);
        expect(doNotCalc[19]).toBe(false);
        expect(doNotCalc[20]).toBe(false);
        expect(doNotCalc[21]).toBe(false);
        expect(doNotCalc[22]).toBe(false);
        expect(doNotCalc[23]).toBe(false);
        expect(doNotCalc[24]).toBe(true);
        expect(doNotCalc[25]).toBe(false);
        expect(doNotCalc[26]).toBe(false);
        expect(doNotCalc[27]).toBe(false);
        expect(doNotCalc[28]).toBe(false);
        expect(doNotCalc[29]).toBe(false);
        expect(doNotCalc[30]).toBe(false);
        expect(doNotCalc[31]).toBe(false);
        expect(doNotCalc[32]).toBe(false);
        expect(doNotCalc[33]).toBe(false);
        expect(doNotCalc[34]).toBe(false);
        expect(doNotCalc[35]).toBe(false);
        expect(doNotCalc[36]).toBe(false);
        expect(doNotCalc[37]).toBe(false);
        expect(doNotCalc[38]).toBe(false);
        expect(doNotCalc[39]).toBe(false);
        expect(doNotCalc[40]).toBe(false);
        expect(doNotCalc[41]).toBe(false);
        expect(doNotCalc[42]).toBe(false);
        expect(doNotCalc[43]).toBe(false);
        expect(doNotCalc[44]).toBe(false);
        expect(doNotCalc[45]).toBe(false);
        expect(doNotCalc[46]).toBe(false);
        expect(doNotCalc[47]).toBe(false);
        expect(doNotCalc[48]).toBe(false);

    });

});