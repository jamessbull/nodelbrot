namespace("jim.mandelbrot.image.exporter");
jim.mandelbrot.image.exporter.create = function (_exportDimensions, _mandelbrotSet, _histogramGenerator, _dom, _events) {
    "use strict";
    var exporting = false;

    var exportButton = document.getElementById("export");
    var exportDepth = document.getElementById("exportDepth");
    var histogramProgress = document.getElementById("histogramProgress");
    var imageProgress = document.getElementById("imageProgress");
    var timeProgress = document.getElementById("elapsedTime");
    var downloadButton = document.getElementById("export1");
    var exportDimensions;
    var imageGenerator = jim.parallelImageGenerator.create();
    var palette;

    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);
    function log(thing) {
        console.log(thing);
    }

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    namespace("jim.worker.pool");
    jim.worker.pool.create = function (noOfWorkers, workerUrl, initialJobs, toTransfer) {
        var workers = [];
        for (var i = 0; i < noOfWorkers; i+=1) {
            var worker = new Worker(workerUrl);
            workers.push(worker);
            if (initialJobs.length === noOfWorkers) {
                worker.postMessage(initialJobs[i], [initialJobs[i][toTransfer]]);
            }
        }

        return {
            consume: function (_jobs, _onEachJob, _onAllJobsComplete) {
                var jobsComplete = 0, jobsToComplete = _jobs.length;
                workers.forEach(function (worker) {
                    worker.onmessage = function (e) {
                        var msg = e.data;
                        jobsComplete +=1;
                        var job = _jobs.pop();
                        if (job) this.postMessage(job);
                        _onEachJob(msg);
                        if (jobsComplete === jobsToComplete) _onAllJobsComplete(msg);
                    };
                    worker.postMessage(_jobs.pop());
                });
            }
        };
    };

    function makeExportCanvas(_exportDimensions) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = _exportDimensions.width;
        exportCanvas.height = _exportDimensions.height;
        return exportCanvas;
    }

    function exportImage(histogramData, histogramTotal) {

        function createInitialJobs(number, histoData, histoTotal, nodeList) {
            var initialJobs = [];
            for(var i = 0 ; i < number; i+=1) {
                var histoCopy =  new Uint32Array(histoData);
                initialJobs.push({updateHistogramData: true, paletteNodes: nodeList,histogramData: histoCopy.buffer, histogramSize: histoCopy.length, histogramTotal:histoTotal});
            }
            return initialJobs;
        }

        var ignoreDeadPixelsRadius = document.getElementById("ignoreDeadPixelsRadius");
        _mandelbrotSet.state().setDeadPixelRadius(ignoreDeadPixelsRadius.value);
        var timer = jim.stopwatch.create();
        timer.start();
        var jobs = imageGenerator.run(_mandelbrotSet.state().getExtents(), exportDepth.value,  exportDimensions.width, exportDimensions.height, _mandelbrotSet.state().deadRegions, 100);

        timer.stop();
        console.log("Time taken to build 100 jobs " + timer.elapsed());
        timer.start();
        var initialJobs = createInitialJobs(8, histogramData,  histogramTotal, palette.toNodeList());
        var workerPool =  jim.worker.pool.create(8, "/js/mandelbrotImageCalculatingWorker.js", initialJobs, "histogramData");
        timer.stop();
        timer.elapsed("Create workers and send histogram to them");
        var exportCanvas = makeExportCanvas(exportDimensions);
        var context = exportCanvas.getContext('2d');
        var imageData = new Uint8ClampedArray(exportCanvas.width * exportCanvas.height * 4);
        var pixelsPerChunk = (exportDimensions.width * exportDimensions.height) / 100;

        function onAllJobsComplete() {
            _dom.deselectButton(exportButton);
            _dom.selectButton(downloadButton);
            context.putImageData(new ImageData(imageData, exportCanvas.width, exportCanvas.height), 0,0);
            downloadButton.href = exportCanvas.toDataURL("image/png");
            exporting = false;
            timeReporter.stop();
        }

        function onEachJob(_msg) {
            events.fire("imageExportProgress", pixelsPerChunk);
            imageData.set(new Uint8ClampedArray(_msg.result.imgData), _msg.result.offset);
        }

        workerPool.consume(jobs, onEachJob, onAllJobsComplete);
    }


    exportButton.onclick = function () {
        exportDimensions = _exportDimensions.dimensions();
        _dom.selectButton(exportButton);
        imageReporter.reportOn(exportDimensions.width, exportDimensions.height);
        var roundedWidth = Math.floor(exportDimensions.width / 10);
        var roundedHeight = Math.floor(exportDimensions.height / 10);
        histogramReporter.reportOn( roundedWidth, roundedHeight);
        timeReporter.start();
        console.log('Building histogram');
        if (exporting === true) {
            console.log("Can't export while export already in progress");
            return false ;
        }

        function addFirstToSecond(arr1, arr2) {
            for(var i = 1; i <= arr1.length; i +=1){
                arr2[i] += arr1[i];
            }
        }

        var fullHistogramData = new Uint32Array(parseInt(exportDepth.value) + 1);
        var fullHistogramTotal = 0;
        var jobs = _histogramGenerator.run(_mandelbrotSet.state().getExtents(), exportDepth.value, roundedWidth, roundedHeight,10);
        var workerPool =  jim.worker.pool.create(8, "/js/histogramCalculatingWorker.js", [], "");

        function onEveryJob(_msg) {
            console.log("on every job");
            fullHistogramTotal += _msg.result.histogramTotal;
            addFirstToSecond(new Uint32Array(_msg.result.histogramData), fullHistogramData);
            events.fire("histogramExportProgress", 280);
            log("a histo job completed");
        }

        function onAllJobsComplete(_msg) {
            console.log("on all complete in histo generator");
            var h = jim.twoPhaseHistogram.create(fullHistogramData.length);
            log("About to total up all the data");
            h.setData(fullHistogramData, fullHistogramTotal);
            h.process();
            log("data well totalled");
            exportImage(fullHistogramData, fullHistogramTotal);
        }
        workerPool.consume(jobs, onEveryJob, onAllJobsComplete);
        exporting = true;
    };
};

