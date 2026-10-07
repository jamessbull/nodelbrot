describe("worker pool", function () {
    "use strict";
    var realWorker;
    var created;

    // Replies to each job after a moment, or reports an error for a job with fail set.
    function FakeWorker() {
        var self = this;
        created.push(self);
        self.postMessage = function (job) {
            setTimeout(function () {
                if (job.fail) {
                    self.onerror({message: "it broke"});
                } else {
                    self.onmessage({data: {batchid: job.batchid, n: job.n}});
                }
            }, 1);
        };
        self.terminate = function () {};
    }

    beforeEach(function () {
        realWorker = globalThis.Worker;
        globalThis.Worker = FakeWorker;
        created = [];
    });

    afterEach(function () {
        globalThis.Worker = realWorker;
    });

    it("should run a batch and report each reply and the end", function (done) {
        var pool = jim.worker.pool.create(2, "worker.js");
        var replies = [];
        pool.consume([{n: 1}, {n: 2}, {n: 3}], function (msg) { replies.push(msg.n); }, function () {
            expect(replies.sort()).toEqual([1, 2, 3]);
            done();
        }, function () {
            done.fail("no error expected");
        });
    });

    it("should stop a batch and report the error when a worker fails", function (done) {
        var pool = jim.worker.pool.create(2, "worker.js");
        pool.consume([{n: 1}, {n: 2, fail: true}, {n: 3}], function () {}, function () {
            done.fail("the batch should not complete");
        }, function (message) {
            expect(message).toBe("it broke");
            // Give the other jobs time to reply; they must not complete the failed batch.
            setTimeout(done, 20);
        });
    });

    it("should fail the next batch if a worker failed while none was running", function (done) {
        var pool = jim.worker.pool.create(1, "worker.js");
        created[0].onerror({message: "could not load"});
        pool.consume([{n: 1}], function () {}, function () {
            done.fail("the batch should not run");
        }, function (message) {
            expect(message).toBe("could not load");
            done();
        });
    });

    it("should run batches normally after a failed one", function (done) {
        var pool = jim.worker.pool.create(1, "worker.js");
        pool.consume([{n: 1, fail: true}], function () {}, function () {}, function () {
            pool.consume([{n: 2}], function () {}, function () { done(); }, function () {
                done.fail("no error expected");
            });
        });
    });
});
