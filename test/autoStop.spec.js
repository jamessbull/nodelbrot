import { createEvents } from "../src/client/events.js";
import { createAutoStop } from "../src/client/autoStop.js";

describe("stopping on its own", function () {
    // A renderer's frames: each goes from the depth the one before reached to depth, with the escaped
    // total as given, those that escaped in it doing so at its last iteration, as renderers say.
    function rendering(pixels = 100) {
        const events = createEvents();
        createAutoStop(events, pixels);
        let stops = 0;
        let reached = 0;
        let escapedSoFar = 0;
        events.listenTo(events.stop, () => { stops += 1; });
        return {
            events,
            stops: () => stops,
            // The view moves: a zoom out, and rendering from the start.
            zoomOut: function () {
                events.fire(events.zoomOut);
                reached = 0;
                escapedSoFar = 0;
            },
            frame: function (depth, escaped) {
                const update = new Uint32Array(Math.max(1, depth - reached));
                update[update.length - 1] = escaped - escapedSoFar;
                events.fire(events.escapesFromWorkers, {update, currentIteration: reached});
                events.fire(events.escapedTotal, escaped);
                events.fire(events.depthReached, reached);
                events.fire(events.frameComplete);
                reached = depth;
                escapedSoFar = escaped;
            }
        };
    }

    it("should stop once no pixel has escaped for a while, and the depth has doubled since one did", function () {
        const render = rendering();
        render.frame(1000, 50);
        // Escapes stop at 1000; 20 frames on, but not yet twice as deep.
        for (let depth = 1010; depth < 1200; depth += 10) render.frame(depth, 50);
        expect(render.stops()).toBe(0);
        for (let depth = 1200; depth <= 2200; depth += 100) render.frame(depth, 50);
        expect(render.stops()).toBe(1);
    });

    it("should carry on while escapes are few and far between, deep in", function () {
        const render = rendering();
        let escaped = 20;
        // One escape every 50 frames, the depth going up 10,000 a frame: never twice as deep.
        for (let frame = 1; frame < 500; frame += 1) {
            if (frame % 50 === 0) escaped += 1;
            render.frame(1000000 + (frame * 10000), escaped);
        }
        expect(render.stops()).toBe(0);
    });

    it("should not stop until a tenth of the image has escaped", function () {
        const render = rendering();
        for (let depth = 100; depth <= 100000; depth += 100) render.frame(depth, 5);
        expect(render.stops()).toBe(0);
    });

    it("should carry on to the end after Go, until the view moves", function () {
        const render = rendering();
        render.frame(1000, 50);
        render.events.fire(render.events.start, {byUser: true});
        for (let depth = 1100; depth <= 10000; depth += 100) render.frame(depth, 50);
        expect(render.stops()).toBe(0);
        // Not from anything else that carries on rendering, such as leaving the examine panel.
        render.zoomOut();
        render.frame(1000, 50);
        render.events.fire(render.events.start);
        for (let depth = 1100; depth <= 10000 && render.stops() === 0; depth += 100) render.frame(depth, 50);
        expect(render.stops()).toBe(1);
    });
});
