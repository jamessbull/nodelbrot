describe("mandelbrot escape histogram", function () {
    "use strict";
    it("should count the number of pixels which escape on a given iteration", function () {
        var histogram = jim.histogram.create();
        histogram.add(1);
        histogram.add(2);
        histogram.add(2);
        histogram.add(4);
        histogram.add(4);
        histogram.add(4);
        expect(histogram.get(1)).toBe(1);
        expect(histogram.get(2)).toBe(3);
        expect(histogram.get(4)).toBe(6);
    });

    it("should calculate the percentage of escaped pixels which have escaped by a given iteration number", function () {
        var histogram = jim.histogram.create();
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

        expect(histogram.percentEscapedBy(1)).toBe(0.1);
        expect(histogram.percentEscapedBy(2)).toBe(0.3);
        expect(histogram.percentEscapedBy(4)).toBe(0.4);
        expect(histogram.percentEscapedBy(10)).toBe(1.0);
    });

    it("should find the lowest thing to be entered", function () {
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
        expect(histogram.percentEscapedBy(8)).toBe(0.4);
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

    it("should keep an accurate total regardless of the order things are entered", function () {
        var histogram = jim.histogram.create();
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);
        histogram.add(1);

        histogram.add(5);
        histogram.add(2);

        expect(histogram.get(5)).toBe(8);
    });

    it("should be able to rebuild the histogram from the current state", function () {
        //set up state as follows
        // 1 :true,  2 :false, 3 :true,  4 :false, 5 :true
        // 6 :false, 7 :true   8 :false, 9 :true,  10:false
        // 11:true,  12:false, 13:true,  14:false, 15:true
        // 16:false, 17:true,  18:false, 19:true,  20:false
        // 21:true, 22:false , 23:true,  24:false, 25:true

        var i = 0, escaped = false;
        var state = jim.common.grid.create(5,5, function () {
            i += 1;
            escaped = !escaped;
            return {escapedAt: i, alreadyEscaped: escaped};
        });

        var histogram = jim.histogram.create();
        histogram.rebuild(state);
        expect(histogram.get(1)).toBe(1);
        expect(histogram.get(5)).toBe(3);
        expect(histogram.get(10)).toBe(5);
        expect(histogram.get(15)).toBe(8);
        expect(histogram.get(20)).toBe(10);
        expect(histogram.get(25)).toBe(13);
    });
});