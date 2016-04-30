namespace("jim.parallel.jobRunner");
jim.parallel.jobRunner.create = function (_events, _jobs, _worker) {
    "use strict";
    var numThreads = 4;
    var jobsDone = 0;
    var jobIds = [];

    for (var i = 0 ; i < _jobs.length; i +=1) {
        jobIds.push(i);
    }

    var run = function (worker) {
        if (jobIds.length > 0) {
            var id = jobIds.shift();
            worker.currentJobId = id;
            worker.postMessage(_jobs[id]);
        }
    };

    var onJobComplete = function (msg) {
        var job = _jobs[this.currentJobId];
        job.status = "Complete";
        job.result = msg.data;
        jobsDone +=1;
        if (jobsDone >= _jobs.length) {
            _events.fire("jobComplete", _jobs);
        }
        run(this);
    };

    return {
        run: function () {
            for(i = 0; i < numThreads; i+=1) {
                var worker = new Worker(_worker);
                worker.onmessage = onJobComplete;
                run(worker);
            }
        }
    };
};