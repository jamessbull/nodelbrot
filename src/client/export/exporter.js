namespace("jim.mandelbrot.image.exporter");
jim.mandelbrot.image.exporter.create = function (_exportDimensions, state, _dom, _events) {
    "use strict";
    var exporting = false;

    var exportButton = document.getElementById("export");
    var lastExportButton = document.getElementById("openLastExportButton");
    var exportDepth = document.getElementById("exportDepth");
    var histogramProgress = document.getElementById("histogramProgress");
    var imageProgress = document.getElementById("imageProgress");
    var timeProgress = document.getElementById("elapsedTime");
    var downloadButton = document.getElementById("export1");
    var exportProgress = document.getElementById("exportProgress");
    var exportDimensions;
    var palette;
    var deadRegions = [];
    var exportCanvas;
    var exportUrl;
    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);

    lastExportButton.onclick = function () {
        window.open(exportUrl);
    };

    downloadButton.onclick = function () {
        _dom.hide(exportProgress);
        window.open(exportCanvas.toDataURL("image/png"));
    };

    _dom.hide(exportProgress);

    function log(thing) {
        console.log(thing);
    }

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    on(_events.deadRegionsPublished, function (_deadRegions) {
        deadRegions = _deadRegions;
    });

    function makeExportCanvas(_exportDimensions) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = _exportDimensions.width;
        exportCanvas.height = _exportDimensions.height;
        return exportCanvas;
    }

    function exportImage(histogramData, histogramTotal) {
        exportUrl = undefined;
        function createInitialJobs(number, histoData, histoTotal, nodeList) {
            var initialJobs = [];
            for(var i = 0 ; i < number; i+=1) {
                var histoCopy =  new Uint32Array(histoData);
                initialJobs.push({workerMessageType: "imageexportworker", updateHistogramData: true, paletteNodes: nodeList,histogramData: histoCopy.buffer, histogramSize: histoCopy.length, histogramTotal:histoTotal});
            }
            return initialJobs;
        }

        var timer = jim.stopwatch.create();
        var extents = state.getExtents();

        var mx = extents.topLeft().x;
        var my = extents.topLeft().y;
        var mw = extents.width();
        var mh = extents.height();

        var initialRenderDefinition = jim.messages.renderFragment2.create(0, mx, my, mw, mh, exportDimensions.width, exportDimensions.height);
        var noOfJobs = 100;
        var noOfThreads = noOfJobs < 8 ? noOfJobs : 8;

        var fragments = initialRenderDefinition.split(noOfJobs);
        var splitter = jim.common.arraySplitter.create();
        var deadSections = splitter.split(deadRegions, noOfJobs, 700);

        var jobs = [];
        fragments.forEach(function (fragment,i) {
             jobs[i] = jim.messages.export.create(fragment, exportDepth.value, deadSections[i]);
        });

        var initialJobs = createInitialJobs(noOfThreads, histogramData,  histogramTotal, palette.toNodeList());
        var workerPool =  jim.worker.pool.create(noOfThreads, "/js/unifiedworker.js", initialJobs, "histogramData", "none");

        exportCanvas = makeExportCanvas(exportDimensions);
        var context = exportCanvas.getContext('2d');
        var imageData = new Uint8ClampedArray(exportCanvas.width * exportCanvas.height * 4);
        var pixelsPerChunk = (exportDimensions.width * exportDimensions.height) / noOfJobs;


        function onAllJobsComplete() {
            _dom.deselectButton(exportButton);

            context.putImageData(new ImageData(imageData, exportCanvas.width, exportCanvas.height), 0,0);
            if (exportCanvas.toBlob) {
                exportCanvas.toBlob(function(blob) {
                    exportUrl  = URL.createObjectURL(blob);
                    _dom.hide(exportProgress);
                    _dom.removeClass(lastExportButton, "disabled");
                    window.open(exportUrl);
                });
            } else {
                _dom.removeClass(lastExportButton, "disabled");
                downloadButton.href = exportCanvas.toDataURL("image/png");
            }

            exporting = false;
            timeReporter.stop();
            workerPool.terminate();
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
        _dom.show(exportProgress);
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
        var depth = parseInt(exportDepth.value);
        var source = state.getExtents();
        var calculator = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var dest = jim.rectangle.create(0, 0, roundedWidth, roundedHeight);
        var noOfParts = 10;
        var noOfWorkers = 8;
        calculator.calculate(source, dest, depth, noOfParts, noOfWorkers, exportImage);

        exporting = true;
    };
};

