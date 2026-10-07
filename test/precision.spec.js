import { createEvents } from "../src/client/events.js";
import { isNearLimit, precisionWarning } from "../src/client/precision.js";
import { viewAt } from "../src/client/view.js";

describe("precision limit", function () {
    it("should not be near the limit for ordinary views", function () {
        expect(isNearLimit(viewAt(-0.75, 0, 0.005))).toBe(false);
        expect(isNearLimit(viewAt(-0.74364, 0.13182, 1e-13))).toBe(false);
    });

    it("should be near the limit once pixels are small enough for rounding to show", function () {
        expect(isNearLimit(viewAt(-0.74364, 0.13182, 3e-14))).toBe(true);
    });

    it("should go by the pixel size, not by how close the point is to the origin", function () {
        expect(isNearLimit(viewAt(0.2869, 0.0143, 3e-14))).toBe(true);
    });

    it("should warn once each time the view goes past the limit, and show the badge while it is", function () {
        const events = createEvents();
        const shown = [];
        const badge = {hidden: true};
        precisionWarning({events, notice: {show: function (m) { shown.push(m); }}, badge});
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 1e-10));
        expect(badge.hidden).toBe(true);
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 3e-14));
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 1e-14));
        expect(shown.length).toBe(1);
        expect(badge.hidden).toBe(false);
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 1e-10));
        expect(badge.hidden).toBe(true);
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 3e-14));
        expect(shown.length).toBe(2);
    });
});
