namespace("jim.parallel.jobRunner");
jim.parallel.jobRunner.create = function (_events, _worker) {
    "use strict";
    var numThreads = 8;
    var jobsToRun;
    var jobsDone = 0;
    var jobIds = [];
    var workers = [];
    var completeEvent = "jobComplete";


    var run = function (worker) {
        if (jobIds.length > 0) {
            var id = jobIds.shift();
            worker.currentJobId = id;
            var job = jobsToRun[id];
            job.id = id;
            worker.postMessage(job);
        }
    };

    var onJobComplete = function (msg) {
        if (msg.data.result.chunkComplete || msg.data.result.imageDone) {
            var job = jobsToRun[msg.data.id];
            job.status = "Complete";
            job.result = msg.data.result;
            jobsDone +=1;
            if (jobsDone >= jobsToRun.length) {
                _events.fire(completeEvent, jobsToRun);
            }
            run(this);
        }
    };

    return {
        run: function (jobs, event) {
            if(event) {
                completeEvent = event;
            }
            jobsDone = 0;
            jobsToRun = jobs;
            jobIds = [];
            for (var i = 0 ; i < jobsToRun.length; i +=1) {
                jobIds.push(i);
            }
            if (workers.length === 0) {
                for(i = 0; i < numThreads; i+=1) {
                    var worker = new Worker(_worker);
                    workers.push(worker);
                    worker.onmessage = onJobComplete;
                }
            }
            workers.forEach(function (worker) {
                run(worker);
            });
        },
        dispose: function () {
            workers.forEach(function (worker) {
                worker.terminate();
            });
            workers = [];
        }
    };
};