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

    it("should be able to move a rectangle", function () {
        var rect = jim.rectangle.create(100, 100, 50, 25);
        rect.move(5, 6);

        expect(rect.topLeft().x).toBe(105);
        expect(rect.topLeft().y).toBe(106);

        expect(rect.topRight().x).toBe(155);
        expect(rect.topRight().y).toBe(106);

        expect(rect.bottomRight().x).toBe(155);
        expect(rect.bottomRight().y).toBe(131);

        expect(rect.bottomLeft().x).toBe(105);
        expect(rect.bottomLeft().y).toBe(131);
    });

    it("a coordinate should be able to give the distance between itself and another coordinate", function () {
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

describe("a rectangle", function () {
    "use strict";

    var checkRect = function (r, _x, _y, _w, _h) {
        expect(r.topLeft().x).toBe(_x);
        expect(r.topLeft().y).toBe(_y);
        expect(r.width()).toBe(_w);
        expect(r.height()).toBe(_h);
    };

    it("should split a 0 positioned rectangle correctly into two rows", function () {
        var r = jim.rectangle.create(0, 0, 10, 10);
        var split = r.split(2);
        checkRect(split[0], 0, 0, 10, 5);
        expect(split[0].bottomLeft().x).toBe(split[1].topLeft().x);
        expect(split[0].bottomLeft().y).toBe(split[1].topLeft().y);
        checkRect(split[1], 0, 5, 10, 5);
    });

    it("should split a rectangle at 3, 3 correctly into ten rows", function () {
        var r = jim.rectangle.create(3, 3, 10, 10);
        var split = r.split(10);

        checkRect(split[0], 3, 3, 10, 1);
        checkRect(split[1], 3, 4, 10, 1);
        checkRect(split[2], 3, 5, 10, 1);
        checkRect(split[3], 3, 6, 10, 1);
        checkRect(split[4], 3, 7, 10, 1);
        checkRect(split[5], 3, 8, 10, 1);
        checkRect(split[6], 3, 9, 10, 1);
        checkRect(split[7], 3, 10, 10, 1);
        checkRect(split[8], 3, 11, 10, 1);
        checkRect(split[9], 3, 12, 10, 1);
    });

    it("should split a rectangle at -3, -3 correctly into ten rows", function () {
        var r = jim.rectangle.create(-3, -3, 10, 10);
        var split = r.split(10);

        checkRect(split[0], -3, -3, 10, 1);
        checkRect(split[1], -3, -2, 10, 1);
        checkRect(split[2], -3, -1, 10, 1);
        checkRect(split[3], -3, 0, 10, 1);
        checkRect(split[4], -3, 1, 10, 1);
        checkRect(split[5], -3, 2, 10, 1);
        checkRect(split[6], -3, 3, 10, 1);
        checkRect(split[7], -3, 4, 10, 1);
        checkRect(split[8], -3, 5, 10, 1);
        checkRect(split[9], -3, 6, 10, 1);
    });

    it("should report the histogram progress", function () {
        var reportTarget = document.createElement("div");
        var events = jim.events.create();
        var reporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", reportTarget);
        reporter.reportOn(10,10);
        events.fire("imageExportProgress", 10);
        expect(reportTarget.innerText).toEqual("10%");

        events.fire("imageExportProgress", 50);
        expect(reportTarget.innerText).toEqual("60%");

        events.fire("imageExportProgress", 40);
        expect(reportTarget.innerText).toEqual("100%");
    });

    it("should reset when it hits 100 %", function () {
        var reportTarget = document.createElement("div");
        var events = jim.events.create();


        var reporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", reportTarget);
        reporter.reportOn(10,10);
        events.fire("imageExportProgress", 10);
        expect(reportTarget.innerText).toEqual("10%");

        events.fire("imageExportProgress", 50);
        expect(reportTarget.innerText).toEqual("60%");

        events.fire("imageExportProgress", 40);
        expect(reportTarget.innerText).toEqual("100%");


        events.fire("imageExportProgress", 40);
        expect(reportTarget.innerText).toEqual("40%");
    });

    it("should round to a specified number of decimal places", function () {
        var x = 1.11111;
        var none = jim.common.round(x, 0);
        var one = jim.common.round(x, 1);
        var two = jim.common.round(x, 2);

        expect(none).toBe(1);
        expect(one).toBe(1.1);
        expect(two).toBe(1.11);
    });
});