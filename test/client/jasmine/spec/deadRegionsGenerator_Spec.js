describe("Dead Regions", function () {
    "use strict";
    var canvas = {drawImage: function () {

    }};
    it(" should show a pixel should be calced when that pixel has escaped", function () {
        var pixelEscapedValues = [
            1, 1,
            1, 1
        ];
        var width = 2;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBeFalsy();
        expect(doNotCalc[1]).toBeFalsy();
        expect(doNotCalc[2]).toBeFalsy();
        expect(doNotCalc[3]).toBeFalsy();
    });

    it(" should show a pixel should be calced when that pixel has not escaped but a neighbour has", function () {
        var pixelEscapedValues = [
            1, 0,
            1, 1
        ];
        var width = 2;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBeFalsy();
        expect(doNotCalc[1]).toBeFalsy();
        expect(doNotCalc[2]).toBeFalsy();
        expect(doNotCalc[3]).toBeFalsy();
    });

    it("if all pixels around a pixel have escaped then it should not be calced", function () {
        var pixelEscapedValues = [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[4]).toBe(1);

    });

    it("pixels at the corners should not be calced if they are surrounded by three unescaped pixels and are not escaped themselves", function () {
        var pixelEscapedValues = [
            0, 0, 1,
            0, 0, 1,
            1, 1, 1,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBeTruthy();
        expect(doNotCalc[1]).toBeFalsy();
        expect(doNotCalc[2]).toBeFalsy();
        expect(doNotCalc[3]).toBeFalsy();
        expect(doNotCalc[4]).toBeFalsy();
        expect(doNotCalc[5]).toBeFalsy();
        expect(doNotCalc[6]).toBeFalsy();
        expect(doNotCalc[7]).toBeFalsy();
        expect(doNotCalc[8]).toBeFalsy();

    });

    it("pixels at the edges should not be calced if they are surrounded by three unescaped pixels and are not escaped themselves", function () {
        var pixelEscapedValues = [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBeTruthy();
        expect(doNotCalc[1]).toBeFalsy();
        expect(doNotCalc[2]).toBeFalsy();
        expect(doNotCalc[3]).toBeTruthy();
        expect(doNotCalc[4]).toBeFalsy();
        expect(doNotCalc[5]).toBeFalsy();
        expect(doNotCalc[6]).toBeTruthy();
        expect(doNotCalc[7]).toBeFalsy();
        expect(doNotCalc[8]).toBeFalsy();

    });

    it("pixels surrounded should not be calced", function () {
        var pixelEscapedValues = [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
        ];
        var width = 3;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(1);
        expect(doNotCalc[0]).toBeTruthy();
        expect(doNotCalc[1]).toBeTruthy();
        expect(doNotCalc[2]).toBeTruthy();
        expect(doNotCalc[3]).toBeTruthy();
        expect(doNotCalc[4]).toBeTruthy();
        expect(doNotCalc[5]).toBeTruthy();
        expect(doNotCalc[6]).toBeTruthy();
        expect(doNotCalc[7]).toBeTruthy();
        expect(doNotCalc[8]).toBeTruthy();

    });


    it("pixels surrounded should not be calced", function () {
        var pixelEscapedValues = [
            1, 1, 1, 1, 1, 1, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 1, 1, 1,
        ];
        var width = 7;

        var dead = jim.mandelbrot.deadRegions.create(events, canvas, canvas).calculator(pixelEscapedValues, width);
        var doNotCalc = dead.regions(2);
        expect(doNotCalc[0]).toBeFalsy();
        expect(doNotCalc[1]).toBeFalsy();
        expect(doNotCalc[2]).toBeFalsy();
        expect(doNotCalc[3]).toBeFalsy();
        expect(doNotCalc[4]).toBeFalsy();
        expect(doNotCalc[5]).toBeFalsy();
        expect(doNotCalc[6]).toBeFalsy();
        expect(doNotCalc[7]).toBeFalsy();
        expect(doNotCalc[8]).toBeFalsy();
        expect(doNotCalc[8]).toBeFalsy();
        expect(doNotCalc[9]).toBeFalsy();
        expect(doNotCalc[10]).toBeFalsy();
        expect(doNotCalc[11]).toBeFalsy();
        expect(doNotCalc[12]).toBeFalsy();
        expect(doNotCalc[13]).toBeFalsy();
        expect(doNotCalc[14]).toBeFalsy();
        expect(doNotCalc[15]).toBeFalsy();
        expect(doNotCalc[16]).toBeFalsy();
        expect(doNotCalc[17]).toBeFalsy();
        expect(doNotCalc[18]).toBeFalsy();
        expect(doNotCalc[19]).toBeFalsy();
        expect(doNotCalc[20]).toBeFalsy();
        expect(doNotCalc[21]).toBeFalsy();
        expect(doNotCalc[22]).toBeFalsy();
        expect(doNotCalc[23]).toBeFalsy();
        expect(doNotCalc[24]).toBeTruthy();
        expect(doNotCalc[25]).toBeFalsy();
        expect(doNotCalc[26]).toBeFalsy();
        expect(doNotCalc[27]).toBeFalsy();
        expect(doNotCalc[28]).toBeFalsy();
        expect(doNotCalc[29]).toBeFalsy();
        expect(doNotCalc[30]).toBeFalsy();
        expect(doNotCalc[31]).toBeFalsy();
        expect(doNotCalc[32]).toBeFalsy();
        expect(doNotCalc[33]).toBeFalsy();
        expect(doNotCalc[34]).toBeFalsy();
        expect(doNotCalc[35]).toBeFalsy();
        expect(doNotCalc[36]).toBeFalsy();
        expect(doNotCalc[37]).toBeFalsy();
        expect(doNotCalc[38]).toBeFalsy();
        expect(doNotCalc[39]).toBeFalsy();
        expect(doNotCalc[40]).toBeFalsy();
        expect(doNotCalc[41]).toBeFalsy();
        expect(doNotCalc[42]).toBeFalsy();
        expect(doNotCalc[43]).toBeFalsy();
        expect(doNotCalc[44]).toBeFalsy();
        expect(doNotCalc[45]).toBeFalsy();
        expect(doNotCalc[46]).toBeFalsy();
        expect(doNotCalc[47]).toBeFalsy();
        expect(doNotCalc[48]).toBeFalsy();

    });

});