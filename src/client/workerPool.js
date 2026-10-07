// A fixed set of web workers, made by newWorker().
// consume runs a batch of jobs, one per worker at a time, and calls onEachJob with each reply and
// onAllJobsComplete after the last. A job with a workerIndex runs on that worker (e.g. because the worker
// holds its state); other jobs go to whichever worker is free. Replies from earlier batches are ignored.
// If a worker reports an error (it threw, or its script failed to load), the batch stops and onError is
// called with the error's message instead; an error while no batch is running fails the next batch.
// sendToEach posts messageFor(i) to each worker i, expecting no reply; workers handle messages in order,
// so it can set workers up for the next batch.
// The buffers in a job's or message's transfer list, if it has one, are transferred instead of copied.
export function createWorkerPool(noOfWorkers, newWorker) {
    let batchid = 0;
    let failBatch = null;           // ends the running batch with an error, if one is running
    let unreportedError = null;
    const workers = Array.from({ length: noOfWorkers }, () => {
        const worker = newWorker();
        worker.onerror = function (e) {
            const message = (e && e.message) || "A worker failed";
            if (failBatch) {
                failBatch(message);
            } else {
                unreportedError = message;
            }
        };
        return worker;
    });

    function post(worker, message) {
        const transfer = message.transfer || [];
        delete message.transfer;
        worker.postMessage(message, transfer);
    }

    return {
        consume: function (jobs, onEachJob, onAllJobsComplete, onError) {
            let jobsComplete = 0;
            const jobsToComplete = jobs.length;
            const currentBatchId = batchid += 1;
            let finished = false;
            failBatch = function (message) {
                if (finished) return;
                finished = true;
                failBatch = null;
                if (onError) {
                    onError(message);
                }
            };
            if (unreportedError) {
                const message = unreportedError;
                unreportedError = null;
                failBatch(message);
                return;
            }
            const sharedJobs = jobs.filter((job) => job.workerIndex === undefined);
            const pinnedJobs = workers.map((worker, i) => jobs.filter((job) => job.workerIndex === i));
            workers.forEach(function (worker, i) {
                function postNextJob() {
                    const job = pinnedJobs[i].shift() || sharedJobs.shift();
                    if (job) {
                        job.batchid = currentBatchId;
                        post(worker, job);
                    }
                }
                worker.onmessage = function (e) {
                    const msg = e.data;
                    if (finished || msg.batchid !== currentBatchId) {
                        return;
                    }
                    jobsComplete += 1;
                    postNextJob();
                    onEachJob(msg);
                    if (jobsComplete === jobsToComplete) {
                        finished = true;
                        failBatch = null;
                        onAllJobsComplete(msg);
                    }
                };
                postNextJob();
            });
        },
        sendToEach: function (messageFor) {
            workers.forEach((worker, i) => post(worker, messageFor(i)));
        },
        terminate: function () {
            workers.forEach((worker) => worker.terminate());
        }
    };
}

// How many workers to run at once: one per hardware thread, less one for the page itself. Browsers that
// don't say how many threads there are get 3, and very large machines are capped at 32, as each worker
// adds a little work for the page every frame.
export function workerCount() {
    const threads = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
    return Math.max(1, Math.min(32, threads - 1));
}
