import { createEvents } from "../src/client/events.js";
import { viewAt } from "../src/client/view.js";
import { isNearLimit, precisionWarning } from "../src/client/precision.js";

describe("precision limit", function () {

    // The view whose top left is (x, y), w wide on a display 700 pixels across.
    function view(x, y, w) {
        return viewAt(x + (w / 2), y + (w * 2 / 7), w / 699);
    }

    it("should not be near the limit for ordinary views", function () {
        expect(isNearLimit(view(-2.5, -1, 3.5))).toBe(false);
        expect(isNearLimit(view(-0.74364, 0.13182, 1e-12))).toBe(false);
    });

    it("should be near the limit when pixels are within about 5 steps of double precision", function () {
        expect(isNearLimit(view(-0.74364, 0.13182, 5e-13))).toBe(true);
    });

    it("should allow deeper zooms close to zero, where doubles are more precise", function () {
        expect(isNearLimit(view(-1e-10, -1e-10, 1e-20))).toBe(false);
    });

    it("should warn once each time the view goes past the limit", function () {
        const events = createEvents();
        const shown = [];
        precisionWarning(events, {show: function (m) { shown.push(m); }});
        events.fire(events.viewChanged, view(-0.74364, 0.13182, 1e-10));
        events.fire(events.viewChanged, view(-0.74364, 0.13182, 5e-13));
        events.fire(events.viewChanged, view(-0.74364, 0.13182, 4e-13));
        expect(shown.length).toBe(1);
        events.fire(events.viewChanged, view(-0.74364, 0.13182, 1e-10));
        events.fire(events.viewChanged, view(-0.74364, 0.13182, 5e-13));
        expect(shown.length).toBe(2);
    });
});
