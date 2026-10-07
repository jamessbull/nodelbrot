import { createEvents } from "../src/client/events.js";
import { depthWarning, needsPerturbation, smallestPixel } from "../src/client/precision.js";
import { createViewState } from "../src/client/viewState.js";
import { viewAt } from "../src/client/view.js";
import { rectangle } from "../src/client/geometry.js";

describe("how deep the explorer can go", function () {
    it("should iterate directly for ordinary views", function () {
        expect(needsPerturbation(viewAt(-0.75, 0, 0.005))).toBe(false);
        expect(needsPerturbation(viewAt(-0.74364, 0.13182, 1e-13))).toBe(false);
    });

    it("should iterate by perturbation once pixels are small enough for rounding to show", function () {
        expect(needsPerturbation(viewAt(-0.74364, 0.13182, 3e-14))).toBe(true);
    });

    it("should go by the pixel size, not by how close the point is to the origin", function () {
        expect(needsPerturbation(viewAt(0.2869, 0.0143, 3e-14))).toBe(true);
    });

    it("should stop zooming in at the smallest pixel", function () {
        const events = createEvents();
        const state = createViewState(11, 5, viewAt("-0.75", "0.1", 2e-300), events);
        events.fire(events.zoomToSelection, {area: () => rectangle(0, 0, 1, 1)});
        expect(state.getView().pixelSize).toBe(smallestPixel);
        events.fire(events.transformView, {scale: 1000, translateX: 0, translateY: 0});
        expect(state.getView().pixelSize).toBe(smallestPixel);
    });

    it("should say so when the smallest pixel is reached, and show the badge while it is", function () {
        const events = createEvents();
        const shown = [];
        const badge = {hidden: true};
        depthWarning({events, notice: {show: (m) => shown.push(m)}, badge});
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 1e-200));
        expect(badge.hidden).toBe(true);
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, smallestPixel));
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, smallestPixel));
        expect(shown.length).toBe(1);
        expect(badge.hidden).toBe(false);
        events.fire(events.viewChanged, viewAt(-0.74364, 0.13182, 1e-200));
        expect(badge.hidden).toBe(true);
    });
});
