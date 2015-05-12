describe("Common utilities", function () {
    "use strict";

    it("should create objects to represent a namespace. It should not overwrite existing objects", function () {
        namespace("foo.bar.baz");
        expect(foo.bar.baz).toBeDefined();
        foo.bar.welly = "pumpkin";
        namespace("foo.bar.baz");
        expect(foo.bar.welly).toBe("pumpkin");
    });

    it("should create sub objects even if a higher level object is defined", function () {
        namespace("job.jobby");
        namespace("job.jobby.jobjob");
        expect(job.jobby.jobjob).toBeDefined();
    });

    it("should iterate over a 2d array and apply the supplied function to every element once", function () {
        var processor = jim.common.grid.processor.create(),
            testArr = [[1, 2], [5, 6], [8, 9]],
            testFunc = function (x) {
                return x + 1;
            };
        processor.process(testArr, testFunc);
        expect(testArr[0][0]).toBe(2);
        expect(testArr[0][1]).toBe(3);
        expect(testArr[1][0]).toBe(6);
        expect(testArr[1][1]).toBe(7);
        expect(testArr[2][0]).toBe(9);
        expect(testArr[2][1]).toBe(10);
    });

    it("should create a grid of a certain size with default values created by the supplied function", function () {
        var grid = jim.common.grid.create(3, 3, function (x, y) {
            return x * y;
        });
        expect(grid.at(0, 0)).toBe(0);
        expect(grid.at(0, 1)).toBe(0);
        expect(grid.at(0, 2)).toBe(0);

        expect(grid.at(1, 0)).toBe(0);
        expect(grid.at(1, 1)).toBe(1);
        expect(grid.at(1, 2)).toBe(2);

        expect(grid.at(2, 0)).toBe(0);
        expect(grid.at(2, 1)).toBe(2);
        expect(grid.at(2, 2)).toBe(4);

        grid.replace(function (x) {return x + 2;});

        expect(grid.at(0, 0)).toBe(2);
        expect(grid.at(0, 1)).toBe(2);
        expect(grid.at(0, 2)).toBe(2);

        expect(grid.at(1, 0)).toBe(2);
        expect(grid.at(1, 1)).toBe(3);
        expect(grid.at(1, 2)).toBe(4);

        expect(grid.at(2, 0)).toBe(2);
        expect(grid.at(2, 1)).toBe(4);
        expect(grid.at(2, 2)).toBe(6);

    });

    it("should be able to create a rectangle from coords", function () {
        var r = jim.rectangle.create,
            c = jim.coord.create,
            rect = r(c(10, 10), c(20, 20));

        expect(rect.width()).toBe(20);
        expect(rect.height()).toBe(20);

        expect(rect.topRight().x).toBe(30);
    });

    it("should be able to translate a point from one rect to another", function () {
        var larger     = jim.rectangle.create(-100, -100, 100, 100),
            smaller    = jim.rectangle.create(300, 300, 50, 50),
            pointOne   = larger.at(-100, -100).translateTo(smaller),
            pointTwo   = larger.at(0, 0).translateTo(smaller),
            pointThree = larger.at(-98, -98).translateTo(smaller),
            pointFour  = larger.at(-2, -2).translateTo(smaller);

        expect(pointOne.x).toBe(300);
        expect(pointOne.y).toBe(300);

        expect(pointTwo.x).toBe(350);
        expect(pointTwo.y).toBe(350);

        expect(pointThree.x).toBe(301);
        expect(pointThree.y).toBe(301);

        expect(pointFour.x).toBe(349);
        expect(pointFour.y).toBe(349);
    });

    it("should correctly know the width - height etc of a rectangle", function () {
        var coord = jim.coord.create,
            r = jim.rectangle.create(5, 5, 15, 25);

        expect(r.topLeft().x).toEqual(coord(5, 5).x);
        expect(r.topLeft().y).toEqual(coord(5, 5).y);

        expect(r.topRight().x).toEqual(coord(20, 5).x);
        expect(r.topRight().y).toEqual(coord(20, 5).y);

        expect(r.bottomLeft().x).toEqual(coord(5, 30).x);
        expect(r.bottomLeft().y).toEqual(coord(5, 30).y);

        expect(r.bottomRight().x).toEqual(coord(20, 30).x);
        expect(r.bottomRight().y).toEqual(coord(20, 30).y);

        expect(r.width()).toBe(15);
        expect(r.height()).toBe(25);

        r.width(10);

        expect(r.topLeft().x).toEqual(coord(5, 5).x);
        expect(r.topLeft().y).toEqual(coord(5, 5).y);

        expect(r.topRight().x).toEqual(coord(15, 5).x);
        expect(r.topRight().y).toEqual(coord(15, 5).y);

        expect(r.bottomLeft().x).toEqual(coord(5, 30).x);
        expect(r.bottomLeft().y).toEqual(coord(5, 30).y);

        expect(r.bottomRight().x).toEqual(coord(15, 30).x);
        expect(r.bottomRight().y).toEqual(coord(15, 30).y);

        expect(r.width()).toBe(10);
        expect(r.height()).toBe(25);

        r.height(50);

        expect(r.topLeft().x).toEqual(coord(5, 5).x);
        expect(r.topLeft().y).toEqual(coord(5, 5).y);

        expect(r.topRight().x).toEqual(coord(15, 5).x);
        expect(r.topRight().y).toEqual(coord(15, 5).y);

        expect(r.bottomLeft().x).toEqual(coord(5, 55).x);
        expect(r.bottomLeft().y).toEqual(coord(5, 55).y);

        expect(r.bottomRight().x).toEqual(coord(15, 55).x);
        expect(r.bottomRight().y).toEqual(coord(15, 55).y);

        expect(r.width()).toBe(10);
        expect(r.height()).toBe(50);
    });

    it("should translate a given rectangle from being relative to r1 to being relative to r2 ", function () {
        var rect = jim.rectangle.create,
            translated,
            screen = rect(0, 0, 500, 500),
            mandelbrot = rect(-50, -70, 100, 100),
            selection = rect(100, 100, 100, 100);

        translated = selection.translateFrom(screen).to(mandelbrot);

        expect(translated.topLeft().x).toBe(-30);
        expect(translated.topLeft().y).toBe(-50);
        expect(translated.width()).toBe(20);
        expect(translated.height()).toBe(20);
    });

    it(" a coordinate should be able to give the distance between itself and another coordinate", function () {
        var newCoord = jim.coord.create;

        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).x).toEqual(1);
        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).y).toEqual(1);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
    });

    it("linearly interpolates between two numbers", function () {
        var interpolator = jim.interpolator.create();
        expect(interpolator.interpolate(0, 10, 0.1)).toBe(1);
        expect(interpolator.interpolate(0, 10, 0.5)).toBe(5);
        expect(interpolator.interpolate(0, 10, 1.0)).toBe(10);
        expect(interpolator.interpolate(50, 100, 0.5)).toBe(75);
        expect(interpolator.interpolate(100, 200, 0.1)).toBe(110);
    });
});