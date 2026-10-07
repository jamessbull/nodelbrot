import { createEvents } from "../src/client/events.js";
import { rectangle } from "../src/client/geometry.js";
import { createViewState, fitView, refitView } from "../src/client/viewState.js";

describe("the view", function () {
    function expectView(view, x, y, w, h) {
        expect(view.x).toBeCloseTo(x, 12);
        expect(view.y).toBeCloseTo(y, 12);
        expect(view.width()).toBeCloseTo(w, 12);
        expect(view.height()).toBeCloseTo(h, 12);
    }

    it("should keep its centre and pixel size on a different size of display", function () {
        // 11 x 5 pixels a unit apart, then 21 x 3.
        expectView(refitView(rectangle(0, 0, 10, 4), 11, 5, 21, 3), -5, 1, 20, 2);
    });

    it("should be fitted inside a display of a different shape, centred", function () {
        // A 10 x 4 view on a square display shows 10 x 10.
        expectView(fitView(rectangle(0, 0, 10, 4), 101, 101), 0, -3, 10, 10);
        // and on a very wide one, 40 x 4.
        expectView(fitView(rectangle(0, 0, 10, 4), 401, 41), -15, 0, 40, 4);
    });

    it("should refit the views zoomed in from when the display is resized", function () {
        const events = createEvents();
        const state = createViewState(11, 5, rectangle(0, 0, 10, 4), events);
        state.zoomTo({area: () => rectangle(0, 0, 5, 2)});
        state.resize(21, 5);
        expectView(state.getExtents(), -2.5, 0, 10, 2);
        state.zoomOut();
        expectView(state.getExtents(), -5, 0, 20, 4);
    });

    it("should show a view fitted to the display", function () {
        const events = createEvents();
        const shown = [];
        events.listenTo(events.extentsUpdate, (view) => shown.push(view));
        const state = createViewState(101, 101, rectangle(0, 0, 1, 1), events);
        state.showView(rectangle(0, 0, 10, 4));
        expectView(shown[0], 0, -3, 10, 10);
    });
});

describe("pinching and dragging the view", function () {
    it("should zoom in about the pinch and move with it", function () {
        const events = createEvents();
        // 11 x 5 pixels a unit apart.
        const state = createViewState(11, 5, rectangle(0, 0, 10, 4), events);
        // Twice the size, about pixel (4, 2), which moves to (6, 2).
        events.fire(events.transformAction, {scale: 2, translateX: 6 - 8, translateY: 2 - 4});
        const view = state.getExtents();
        expect(view.x).toBeCloseTo(1, 12);
        expect(view.y).toBeCloseTo(1, 12);
        expect(view.width()).toBeCloseTo(5, 12);
        expect(view.height()).toBeCloseTo(2, 12);
        state.zoomOut();
        expect(state.getExtents().width()).toBe(10);
    });

    it("should move the view the other way to a drag", function () {
        const events = createEvents();
        const state = createViewState(11, 5, rectangle(0, 0, 10, 4), events);
        events.fire(events.transformAction, {scale: 1, translateX: 3, translateY: -1});
        expect(state.getExtents().x).toBeCloseTo(-3, 12);
        expect(state.getExtents().y).toBeCloseTo(1, 12);
        expect(state.notFullyZoomedOut()).toBe(false);
    });
});
