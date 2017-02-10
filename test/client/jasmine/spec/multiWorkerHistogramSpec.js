describe("the multiworker histogram", function () {
    "use strict";
    it("should be the same as the combined worker histogram", function () {
        var calculation = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var source = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var dest = jim.rectangle.create(0,0,700, 400);

        calculation.calculate(source, dest, 1000, 1, 1, function (_data, _total) {
            for(var i = 0 ; i < 100 ; i +=1) {
                console.log(_data[i]);
            }
        });
    });
});