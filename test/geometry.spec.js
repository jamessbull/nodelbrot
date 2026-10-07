import { coord, rectangle } from "../src/client/geometry.js";

describe("geometry", function () {
    it("should be able to create a rectangle from coords", function () {
        const r = rectangle,
            c = coord,
            rect = r(c(10, 10), c(20, 20));

        expect(rect.width()).toBe(20);
        expect(rect.height()).toBe(20);

        expect(rect.topRight().x).toBe(30);
    });

    it("should be able to translate a point from one rect to another", function () {
        const larger     = rectangle(-100, -100, 100, 100),
            smaller    = rectangle(300, 300, 50, 50),
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
        const r = rectangle(5, 5, 15, 25);

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
        const screen = rectangle(0, 0, 500, 500);
        const mandelbrot = rectangle(-50, -70, 100, 100);
        const selection = rectangle(100, 100, 100, 100);

        const translated = selection.translateFrom(screen).to(mandelbrot);

        expect(translated.topLeft().x).toBe(-30);
        expect(translated.topLeft().y).toBe(-50);
        expect(translated.width()).toBe(20);
        expect(translated.height()).toBe(20);
    });

    it("should be able to move a rectangle", function () {
        const rect = rectangle(100, 100, 50, 25);
        rect.move(5, 6);

        expect(rect.topLeft().x).toBe(105);
        expect(rect.topLeft().y).toBe(106);

        expect(rect.topRight().x).toBe(155);
        expect(rect.topRight().y).toBe(106);

        expect(rect.bottomRight().x).toBe(155);
        expect(rect.bottomRight().y).toBe(131);

        expect(rect.bottomLeft().x).toBe(105);
        expect(rect.bottomLeft().y).toBe(131);

        expect(rect.x).toBe(105);
        expect(rect.y).toBe(106);
    });

    it("should keep x, y and the corners in step after placing and resizing", function () {
        const rect = rectangle(100, 100, 50, 25);
        rect.place(10, 20);
        rect.resize(30, 40);

        expect(rect.x).toBe(10);
        expect(rect.y).toBe(20);
        expect(rect.topLeft().x).toBe(10);
        expect(rect.bottomRight().x).toBe(40);
        expect(rect.bottomRight().y).toBe(60);
        expect(rect.copy().x).toBe(10);
    });

    it("a coordinate should be able to give the distance between itself and another coordinate", function () {
        const newCoord = coord;

        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).x).toEqual(1);
        expect(newCoord(2, 4).distanceTo(newCoord(3, 5)).y).toEqual(1);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
        expect(newCoord(5, 5).distanceTo(newCoord(3, 3)).y).toEqual(-2);
    });
});
