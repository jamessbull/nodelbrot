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

        grid.run(function (x) {return x + 2;});

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

    it(" a coordinate should be able to give the distance between itself and another coordinate", function () {
        var newCoord = jim.coord.create;

        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).x).toEqual(1);
        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).y).toEqual(1);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
    });
});