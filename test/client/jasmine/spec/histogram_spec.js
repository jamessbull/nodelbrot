describe("mandelbrot escape histogram", function () {
    "use strict";
    it("should count the number of pixels which escape on a given iteration", function () {
        var histogram =  jim.twoPhaseHistogram.create(10);
        histogram.add(1);
        histogram.add(2);
        histogram.add(2);
        histogram.add(4);
        histogram.add(4);
        histogram.add(4);
        histogram.process();
        expect(histogram.get(1)).toBe(1);
        expect(histogram.get(2)).toBe(3);
        expect(histogram.get(4)).toBe(6);
    });

    it("should calculate the percentage of escaped pixels which have escaped by a given iteration number", function () {
        var histogram =  jim.twoPhaseHistogram.create(11);
        histogram.add(1);
        histogram.add(2);
        histogram.add(2);
        histogram.add(4);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.process();

        expect(histogram.percentEscapedBy(1)).toBe(0.1);
        expect(histogram.percentEscapedBy(2)).toBe(0.3);
        expect(histogram.percentEscapedBy(4)).toBe(0.4);
        expect(histogram.percentEscapedBy(10)).toBe(1.0);
    });

    it("should find the lowest thing to be entered", function () {
        var histogram =  jim.twoPhaseHistogram.create(11);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(4);
        histogram.add(2);
        histogram.add(2);
        histogram.add(1);
        histogram.process();

        expect(histogram.total()).toBe(10);
        expect(histogram.percentEscapedBy(8)).toBe(0.4);
    });

    it("should keep a running total", function () {
        var histogram =  jim.twoPhaseHistogram.create(11);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(10);
        histogram.add(4);
        histogram.add(2);
        histogram.add(2);
        histogram.add(1);
        histogram.process();

        expect(histogram.total()).toBe(10);
    });

    it("should keep an accurate total regardless of the order things are entered", function () {
        var histogram =  jim.twoPhaseHistogram.create(11);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);

        histogram.add(5);
        histogram.add(2);
        histogram.process();

        expect(histogram.get(5)).toBe(8);
    });
});