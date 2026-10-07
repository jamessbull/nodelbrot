import { areaOnScreen, describeCentre, pointAt, shiftView, viewAt, viewShowing } from "../src/client/view.js";

describe("views", function () {
    it("should give the area a display shows", function () {
        // 11 x 5 pixels a unit apart, centred on (5, 2).
        const area = viewAt(5, 2, 1).area(11, 5);
        expect([area.x, area.y, area.width(), area.height()]).toEqual([0, 0, 10, 4]);
    });

    it("should fit an area in a display of a different shape", function () {
        expect(viewShowing(0, 0, 10, 4, 101, 101).pixelSize).toBeCloseTo(0.1, 15);
        expect(viewShowing(0, 0, 10, 4, 401, 41).pixelSize).toBeCloseTo(0.1, 15);
        expect(viewShowing(0, 0, 10, 4, 1001, 41).pixelSize).toBeCloseTo(0.1, 15);
    });

    it("should move and zoom by pixels", function () {
        const moved = shiftView(viewAt(5, 2, 1), 3, -1, 0.25);
        expect(moved.centre()).toEqual({x: 8, y: 1});
        expect(moved.pixelSize).toBe(0.25);
    });

    it("should place points to the precision of the zoom", function () {
        const view = viewAt("-0.743643887037158704752191506114774", "0.131825904205311970493132056385139", 1e-30);
        expect(describeCentre(view)).toEqual({x: "-0.74364388703715870475219150611477", y: "0.13182590420531197049313205638514"});
        expect(pointAt(view, 2, 0).x).toBe("-0.74364388703715870475219150611277");
    });

    it("should keep fewer places when zooming out", function () {
        const deep = viewAt("0.25", "0", 1e-100);
        const out = shiftView(deep, 0, 0, 0.01);
        expect(out.bits).toBeLessThan(deep.bits);
        expect(out.centre().x).toBe(0.25);
    });

    it("should say where another view is on the display", function () {
        // The view zoomed out from is twice the size, so on the display it is twice as big, centred.
        const view = viewAt(5, 2, 1);
        const outer = viewAt(5, 2, 2);
        const area = areaOnScreen(outer, view, 11, 5);
        expect([area.x, area.y, area.width(), area.height()]).toEqual([-5, -2, 22, 10]);
        // Deep in, where the views' centres are the same to a double, it is still placed exactly.
        const deep = viewAt("0.1", "0", 1e-40);
        const besideIt = shiftView(deep, 3, 0);
        expect(areaOnScreen(besideIt, deep, 11, 5).x).toBeCloseTo(3, 9);
    });

    it("should refuse pixels without a size", function () {
        expect(() => viewAt(0, 0, 0)).toThrowError(RangeError);
    });
});
