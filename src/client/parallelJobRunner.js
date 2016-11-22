namespace("jim.parallel.jobRunner");
jim.parallel.jobRunner.create = function (_events, _worker) {
    "use strict";
    var numThreads = 8;
    var jobsToRun;
    var jobsDone = 0;
    var jobIds = [];
    var workers = [];
    var completeEvent = "jobComplete";
    var progressEvent = "progressReport";
    var jobCount = 0;

    function shift(arr) {
        return arr.shift();
    }

    function updateWorkerId(worker, id) {
        worker.currentJobId = id;
    }

    function getJob(jobs, id) {
        var job = jobs[id];
        job.id = id;
        return job;
    }

    var run = function (worker) {
        if (jobIds.length > 0) {
            var id = shift(jobIds);
            updateWorkerId(worker, id);
            var job = getJob(jobsToRun, id);
            if (job.histogramData) {
                worker.postMessage(job, [job.histogramData]);
            } else {
                worker.postMessage(job);
            }
            jobCount += 1;
        }
    };

    var dispose = function () {
        workers.forEach(function (worker, i) {
            worker.terminate();
        });
        workers = [];
    };
    var data;
    var progressReported = 0;

    var initDataArray = function (result) {
        if (data === undefined) {
            var length = result.imgData.length * jobsToRun.length;
            data = new Uint8ClampedArray(length);
        }
    };

    var onJobComplete = function (msg) {
        var result = msg.data.result;
        var type = msg.data.type;
        if (type === "progressReport") {
            var event = msg.data.event;
            progressReported +=1;
            _events.fire(progressEvent, event.msg);
        }

        if (result && (result.chunkComplete || result.imageDone)) {

            var job = jobsToRun[msg.data.id];

            if (result.imageDone) {
                var jobIndex = parseInt(job.id);
                initDataArray(result);
                var resultLength = result.imgData.length;
                var startIndex = jobIndex * resultLength;
                for (var i = 0; i < resultLength; i += 1) {
                    data[ startIndex +i ] = result.imgData[i];
                }
                //console.log("Stitched job " + job.id);
            } else {
                job.result = msg.data.result;
            }

            job.status = "Complete";
            //console.log("job done " + msg.data.id);
            jobsDone +=1;
            if (jobsDone >= jobsToRun.length) {
                if(result.imageDone) {
                    events.fire("imageComplete", {imgData: data});
                    data = [];
                } else {
                    _events.fire(completeEvent, jobsToRun);
                }
                dispose();

            }
            run(this);
        }
    };

    return {
        run: function (jobs, event, _progressEvent) {
            if(event) {
                completeEvent = event;
            }
            if(_progressEvent) {
                progressEvent = _progressEvent;
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
            console.log("Starting jobs");
            workers.forEach(function (worker) {
                run(worker);
            });
        }
    };
};