describe("the multithreaded job runner", function () {
    "use strict";


    it("should send a message when it is finished", function (done) {
        var events = jim.events.create();
        var jobSpec = function (_type) {
            return {action: "Eat Cheese", type: _type};
        };
        var worker = "/specs/testWorker.js";
        var jobs =  [ jobSpec("Edam"), jobSpec("Brie") ];
        var runner = jim.parallel.jobRunner.create(events, jobs, worker);

        events.listenTo("jobComplete", function (jobs) {
            expect(jobs[0].type).toBe("Edam");
            expect(jobs[0].status).toBe("Complete");
            expect(jobs[0].result.action).toBe("Eaten");

            expect(jobs[1].type).toBe("Brie");
            expect(jobs[1].status).toBe("Complete");
            expect(jobs[1].result.action).toBe("Eaten");
            done();
        });

        runner.run();

    });
});