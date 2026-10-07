import { createEvents } from "../src/client/events.js";
import { rectangle } from "../src/client/geometry.js";
import { createViewState } from "../src/client/viewState.js";
import { viewAt } from "../src/client/view.js";

describe("the view state", function () {
    // An 11 x 5 pixel display, centred on (5, 2) with pixels a unit apart, so pixel (i, j) is at (i, j).
    function state(events) {
        return createViewState(11, 5, viewAt(5, 2, 1), events);
    }

    function expectCentre(view, x, y, pixelSize) {
        const centre = view.centre();
        expect(centre.x).toBeCloseTo(x, 12);
        expect(centre.y).toBeCloseTo(y, 12);
        expect(view.pixelSize).toBeCloseTo(pixelSize, 12);
    }

    it("should zoom in to a selection, and back out", function () {
        const events = createEvents();
        const views = state(events);
        // A selection half the display's width, from pixel (0, 0).
        events.fire(events.zoomToSelection, {area: () => rectangle(0, 0, 5, 2)});
        expectCentre(views.getView(), 2.5, 1, 0.5);
        events.fire(events.zoomOut);
        expectCentre(views.getView(), 5, 2, 1);
        expect(views.notFullyZoomedOut()).toBe(false);
    });

    it("should move the other way to the image", function () {
        const events = createEvents();
        const views = state(events);
        events.fire(events.moveBy, {x: 3, y: -1});
        expectCentre(views.getView(), 2, 3, 1);
    });

    it("should zoom in about a pinch and move with it", function () {
        const events = createEvents();
        const views = state(events);
        // Twice the size, about pixel (4, 2), which moves to (6, 2).
        events.fire(events.transformView, {scale: 2, translateX: 6 - 8, translateY: 2 - 4});
        expect(views.getArea().x).toBeCloseTo(1, 12);
        expect(views.getArea().y).toBeCloseTo(1, 12);
        expect(views.getArea().width()).toBeCloseTo(5, 12);
        events.fire(events.zoomOut);
        expectCentre(views.getView(), 5, 2, 1);
    });

    it("should not keep a drag to zoom back out to", function () {
        const events = createEvents();
        const views = state(events);
        events.fire(events.transformView, {scale: 1, translateX: 3, translateY: -1});
        expect(views.getArea().x).toBeCloseTo(-3, 12);
        expect(views.notFullyZoomedOut()).toBe(false);
    });

    it("should show more at the same zoom on a bigger display", function () {
        const events = createEvents();
        const views = state(events);
        views.resize(21, 5);
        expect(views.getArea().x).toBeCloseTo(-5, 12);
        expect(views.getArea().width()).toBeCloseTo(20, 12);
    });

    it("should show all of an area, centred, whatever the display's shape", function () {
        const events = createEvents();
        const shown = [];
        events.listenTo(events.viewChanged, (view) => shown.push(view));
        const views = createViewState(101, 101, viewAt(0, 0, 1), events);
        views.showArea({x: 5, y: 2, w: 10, h: 4});
        expectCentre(shown[0], 5, 2, 0.1);
    });

    it("should zoom far past where doubles can tell pixels apart", function () {
        const events = createEvents();
        const views = createViewState(101, 101, viewAt("-0.75", "0.1", 1e-200), events);
        events.fire(events.moveBy, {x: -1, y: 0});
        events.fire(events.moveBy, {x: -1, y: 0});
        const view = views.getView();
        // Two pixels right of -0.75 is still -0.75 to a double, but not in the view.
        expect(view.centre().x).toBe(-0.75);
        expect(view.x - viewAt("-0.75", "0.1", 1e-200).x).toBeGreaterThan(0n);
    });
});
