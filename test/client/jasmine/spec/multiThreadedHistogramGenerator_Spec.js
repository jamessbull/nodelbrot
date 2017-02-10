

describe("the histogram Job Builder", function () {
    "use strict";

    it("should create a message that can be used by the histogram worker", function () {
        var createHistogramMessage = jim.parallelHistogramGenerator.message.create;
        var extents = jim.defaults.mandelbrotExtents;
        var msg = createHistogramMessage(1000, 700, 400, extents);

        expect(msg.maxIterations).toBe(1000);
        expect(msg.exportWidth).toBe(700);
        expect(msg.exportHeight).toBe(400);
        expect(msg.mx).toBe(extents.topLeft().x);
        expect(msg.my).toBe(extents.topLeft().y);
        expect(msg.mw).toBe(extents.width());
        expect(msg.mh).toBe(extents.height());

    });
});