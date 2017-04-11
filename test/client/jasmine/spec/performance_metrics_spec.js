describe("Performance metrics", function () {
    "use strict";
    it("should respond to FrameComplete event", function (done) {
        events.clear();
        var clock = jim.metrics.clock.create();
        jim.metrics.create(clock, events);
        var fired = 0;

        function waitThenFire () {
            fired += 1;
            if (fired < 5) {
                events.fire(events.frameComplete);
                setTimeout(waitThenFire, 100);
            }
        }
        events.listenTo(events.currentFramesPerSecond, function (fps) {
            if(fired < 5 && fired > 2) {
                expect(fps).toBeGreaterThan(9);
                expect(fps).toBeLessThan(11);
            }
            if (fired === 1) {
                expect(fps).toBeCloseTo(0);
            }
            if (fired === 4){
                done();
            }
        });
        waitThenFire();
    });
});