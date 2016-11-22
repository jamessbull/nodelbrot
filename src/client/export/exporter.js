namespace("jim.mandelbrot.image.exporter");
jim.mandelbrot.image.exporter.create = function (_exportDimensions, _mandelbrotSet, _histogramGenerator, _dom) {
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

    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);

    events.listenTo("imageComplete", function (e) {
        console.log("Image workers all ready about to add all data to export canvas");
        _dom.deselectButton(exportButton);
        _dom.selectButton(downloadButton);
        console.log("performing event complete action");
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportDimensions.width;
        exportCanvas.height = exportDimensions.height;
        var context = exportCanvas.getContext('2d');
        var outImage = context.createImageData(exportCanvas.width, exportCanvas.height);
        console.log("About to set image data");

        outImage.data.set(e.imgData);
        console.log("Image data set");

        context.putImageData(outImage, 0, 0);
        downloadButton.href = exportCanvas.toDataURL("image/png");
        exporting = false;
        timeReporter.stop();
    });

    namespace("jim.worker.pool");
    jim.worker.pool.create = function (noOfWorkers, workerUrl, initialJobs, toTransfer) {
        var workers = [];
        for (var i = 0; i < noOfWorkers; i+=1) {
            var worker = new Worker(workerUrl);
            workers.push(worker);
            worker.postMessage(initialJobs[i], [initialJobs[i][toTransfer]]);
        }
        return {
            consume: function (jobs, handler) {
                workers.forEach(function (worker) {
                    worker.onmessage = function (e) {
                        var job = jobs.pop();
                        if (job)  this.postMessage(job);
                        handler(e.data);
                    };
                    worker.postMessage(jobs.pop());
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

    events.listenTo("histogramExported", function (e) {

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
        var initialJobs = createInitialJobs(8, e.histogramData,  e.histogramTotal, _mandelbrotSet.palette().toNodeList());
        var workerPool =  jim.worker.pool.create(8, "/js/mandelbrotImageCalculatingWorker.js", initialJobs, "histogramData");
        timer.stop();
        timer.elapsed("Create workers and send histogram to them");
        var jobsComplete = 0;

        var exportCanvas = makeExportCanvas(exportDimensions);
        var context = exportCanvas.getContext('2d');
        var imageData = new Uint8ClampedArray(exportCanvas.width * exportCanvas.height * 4);
        var noOfJobs = jobs.length;
        var pixelsPerChunk = (exportDimensions.width * exportDimensions.height) / 100;
        workerPool.consume(jobs, function (_msg) {
            jobsComplete +=1;
            events.fire("imageExportProgress", pixelsPerChunk);
            imageData.set(new Uint8ClampedArray(_msg.result.imgData), _msg.result.offset);
            if (jobsComplete === noOfJobs) {
                _dom.deselectButton(exportButton);
                _dom.selectButton(downloadButton);
                context.putImageData(new ImageData(imageData, exportCanvas.width, exportCanvas.height), 0,0);
                downloadButton.href = exportCanvas.toDataURL("image/png");
                exporting = false;
                timeReporter.stop();
            }
        });
    });


    exportButton.onclick = function () {
        var newRunner = jim.parallel.jobRunner.create;
        var runner = newRunner(events, "/js/histogramCalculatingWorker.js");

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
        var jobs = _histogramGenerator.run(_mandelbrotSet.state().getExtents(), exportDepth.value, roundedWidth, roundedHeight, "histogramExported", "histogramExportProgress",10);
        runner.run(jobs, "jim.histogramGenerator.parallelJob", "histogramExportProgress");
        exporting = true;
    };
};

