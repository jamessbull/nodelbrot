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

    it("should find an element that exists", function () {
        var foo = [4, 7, 9, 23, 43, 54, 56], index;
        index = jim.arrays.find(foo, 4);
        expect(index).toBe(0);
        index = jim.arrays.find(foo, 7);
        expect(index).toBe(1);
        index = jim.arrays.find(foo, 9);
        expect(index).toBe(2);
        index = jim.arrays.find(foo, 23);
        expect(index).toBe(3);
        index = jim.arrays.find(foo, 43);
        expect(index).toBe(4);
        index = jim.arrays.find(foo, 54);
        expect(index).toBe(5);
        index = jim.arrays.find(foo, 56);
        expect(index).toBe(6);
    });

    it("should find the closest larger element if it does not exist", function () {
        var foo = [4, 7, 9, 23, 43, 54, 56, 99, 2000],
            index,
            find = jim.arrays.find;
        expect(find(foo, 3)).toBe(0);
        expect(find(foo, 5)).toBe(1);
        expect(find(foo, 8)).toBe(2);
        expect(find(foo, 22)).toBe(3);
        expect(find(foo, 24)).toBe(4);
        expect(find(foo, 50)).toBe(5);
        expect(find(foo, 55)).toBe(6);
        expect(find(foo, 90)).toBe(7);
        expect(find(foo, 1000)).toBe(8);
        expect(find(foo, 2001)).toBe(9);
    });

    it("should insert a value into an array in the correct place", function () {
        var array = [1, 2, 4, 5];
        jim.arrays.orderedInsert(array, 3);
        expect(array[0]).toBe(1);
        expect(array[1]).toBe(2);
        expect(array[2]).toBe(3);
        expect(array[3]).toBe(4);
        expect(array[4]).toBe(5);
    });

    it("should insert a value into an empty array", function () {
        var array = [];
        jim.arrays.orderedInsert(array, 3);
        expect(array[0]).toBe(3);
    });

    it("should insert into single element array", function () {
        var array = [1];
        jim.arrays.orderedInsert(array, 3);
        expect(array[0]).toBe(1);
        expect(array[1]).toBe(3);
    });

    it("should insert into rear of a small array", function () {
        var array = [1, 2];
        jim.arrays.orderedInsert(array, 3);
        expect(array[0]).toBe(1);
        expect(array[1]).toBe(2);
        expect(array[2]).toBe(3);
    });

    it("should insert a value into front of small array", function () {
        var array = [1, 2];
        jim.arrays.orderedInsert(array, 0);
        expect(array[0]).toBe(0);
        expect(array[1]).toBe(1);
        expect(array[2]).toBe(2);
    });

    it("should ripple object values from the specified index", function () {
        var array = [1, 2, 3, 4, 5],
            histogram = {1: 6, 2: 7, 3: 8, 4: 9, 5: 10};
        jim.arrays.ripple(array, 2, histogram);
        expect(histogram["1"]).toBe(6);
        expect(histogram["2"]).toBe(7);
        expect(histogram["3"]).toBe(9);
        expect(histogram["4"]).toBe(10);
        expect(histogram["5"]).toBe(11);
    });
});