describe("mandelbrot escape histogram", function () {
    "use strict";
    it("should count the number of pixels which escape on a given iteration", function () {
        var histogram = jim.histogram.create();
        histogram.add(4);
        histogram.add(4);
        histogram.add(4);
        histogram.add(2);
        histogram.add(2);
        histogram.add(1);
        expect(histogram.get(1)).toBe(1);
        expect(histogram.get(2)).toBe(2);
        expect(histogram.get(4)).toBe(3);
    });

    it("should calculate the percentage of escaped pixels which have escaped by a given iteration number", function () {
        var histogram = jim.histogram.create();
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

        expect(histogram.percentEscapedBy(1)).toBe(0.1);
        expect(histogram.percentEscapedBy(2)).toBe(0.3);
        expect(histogram.percentEscapedBy(3)).toBe(0.3);
        expect(histogram.percentEscapedBy(4)).toBe(0.4);
        expect(histogram.percentEscapedBy(5)).toBe(0.4);
        expect(histogram.percentEscapedBy(6)).toBe(0.4);
        expect(histogram.percentEscapedBy(7)).toBe(0.4);
        expect(histogram.percentEscapedBy(8)).toBe(0.4);
        expect(histogram.percentEscapedBy(9)).toBe(0.4);
        expect(histogram.percentEscapedBy(10)).toBe(1.0);
        expect(histogram.percentEscapedBy(11)).toBe(1.0);
    });

    it("should keep a running total", function () {
        var histogram = jim.histogram.create();
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

        expect(histogram.total()).toBe(10);
    });
});