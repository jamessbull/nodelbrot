describe("precision limit", function () {
    "use strict";
    var isNearLimit = jim.mandelbrot.precision.isNearLimit;

    function view(x, y, w) {
        return jim.rectangle.create(x, y, w, w * 4 / 7);
    }

    it("should not be near the limit for ordinary views", function () {
        expect(isNearLimit(view(-2.5, -1, 3.5), 700)).toBe(false);
        expect(isNearLimit(view(-0.74364, 0.13182, 1e-12), 700)).toBe(false);
    });

    it("should be near the limit when pixels are within about 5 steps of double precision", function () {
        expect(isNearLimit(view(-0.74364, 0.13182, 5e-13), 700)).toBe(true);
    });

    it("should allow deeper zooms close to zero, where doubles are more precise", function () {
        expect(isNearLimit(view(-1e-10, -1e-10, 1e-20), 700)).toBe(false);
    });

    it("should warn once each time the view goes past the limit", function () {
        events.clear();
        var shown = [];
        jim.mandelbrot.precision.warning(events, {show: function (m) { shown.push(m); }}, 700);
        events.fire(events.extentsUpdate, view(-0.74364, 0.13182, 1e-10));
        events.fire(events.extentsUpdate, view(-0.74364, 0.13182, 5e-13));
        events.fire(events.extentsUpdate, view(-0.74364, 0.13182, 4e-13));
        expect(shown.length).toBe(1);
        events.fire(events.extentsUpdate, view(-0.74364, 0.13182, 1e-10));
        events.fire(events.extentsUpdate, view(-0.74364, 0.13182, 5e-13));
        expect(shown.length).toBe(2);
    });
});
