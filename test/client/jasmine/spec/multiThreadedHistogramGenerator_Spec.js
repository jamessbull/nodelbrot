describe("the multithreaded job runner", function () {
    "use strict";

    it("should send a message when it is finished", function (done) {
        var events = jim.events.create();
        var jobSpec = function (_type, _id) {
            return {action: "Eat Cheese", type: _type, id: _id};
        };
        var worker = "/specs/testWorker.js";
        var jobs =  [ jobSpec("Edam", 0), jobSpec("Brie", 1) ];
        var runner = jim.parallel.jobRunner.create(events, worker);

        events.listenTo("jobComplete", function (jobs) {
            expect(jobs[0].type).toBe("Edam");
            expect(jobs[0].status).toBe("Complete");
            expect(jobs[0].result.action).toBe("Eaten");

            expect(jobs[1].type).toBe("Brie");
            expect(jobs[1].status).toBe("Complete");
            expect(jobs[1].result.action).toBe("Eaten");
            done();
        });

        runner.run(jobs, "jobComplete");
    });
});

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