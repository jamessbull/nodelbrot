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
    var exportProgress = document.getElementById("exportProgress");
    var exportDimensions;
    var palette;
    var deadRegions = [];
    var exportCanvas;

    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);

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

        function createInitialJobs(number, histoData, histoTotal, nodeList) {
            var initialJobs = [];
            for(var i = 0 ; i < number; i+=1) {
                var histoCopy =  new Uint32Array(histoData);
                initialJobs.push({updateHistogramData: true, paletteNodes: nodeList,histogramData: histoCopy.buffer, histogramSize: histoCopy.length, histogramTotal:histoTotal});
            }
            return initialJobs;
        }

        var timer = jim.stopwatch.create();
        var extents = _mandelbrotSet.state().getExtents();

        var mx = extents.topLeft().x;
        var my = extents.topLeft().y;
        var mw = extents.width();
        var mh = extents.height();

        var initialRenderDefinition = jim.messages.renderFragment.create(0, mx, my, mw, mh, exportDimensions.width, exportDimensions.height);
        var fragments = initialRenderDefinition.split(100);
        var splitter = jim.common.arraySplitter.create();
        var deadSections = splitter.split(deadRegions, 100, 700);

        var jobs = [];
        fragments.forEach(function (fragment,i) {
             jobs[i] = jim.messages.export.create(fragment.asMessage(), exportDepth.value, deadSections[i]);
        });

        var initialJobs = createInitialJobs(8, histogramData,  histogramTotal, palette.toNodeList());
        var workerPool =  jim.worker.pool.create(8, "/js/mandelbrotImageCalculatingWorker.js", initialJobs, "histogramData", "none");

        exportCanvas = makeExportCanvas(exportDimensions);
        var context = exportCanvas.getContext('2d');
        var imageData = new Uint8ClampedArray(exportCanvas.width * exportCanvas.height * 4);
        var pixelsPerChunk = (exportDimensions.width * exportDimensions.height) / 100;


        function onAllJobsComplete() {
            _dom.deselectButton(exportButton);

            context.putImageData(new ImageData(imageData, exportCanvas.width, exportCanvas.height), 0,0);
            if (exportCanvas.toBlob) {
                exportCanvas.toBlob(function(blob) {
                    var   url = URL.createObjectURL(blob);
                    window.open(url);
                    _dom.hide(exportProgress);
                });
            } else {
                downloadButton.href = exportCanvas.toDataURL("image/png");
            }

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
        var source = _mandelbrotSet.state().getExtents();
        var calculator = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var dest = jim.rectangle.create(0, 0, roundedWidth, roundedHeight);
        var noOfParts = 10;
        var noOfWorkers = 8;
        calculator.calculate(source, dest, depth, noOfParts, noOfWorkers, exportImage);

        exporting = true;
    };
};

