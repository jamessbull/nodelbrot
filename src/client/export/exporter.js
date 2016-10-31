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

    events.listenTo("histogramExported", function (e) {
        //console.log("Histogram exported");
        var ignoreDeadPixelsRadius = document.getElementById("ignoreDeadPixelsRadius");
        //console.log("export depth is " + exportDepth.value)
        _mandelbrotSet.state().setDeadPixelRadius(ignoreDeadPixelsRadius.value);
        imageGenerator.run(_mandelbrotSet.state().getExtents(),
            exportDepth.value,  exportDimensions.width, exportDimensions.height,
            e.histogramData,  e.histogramTotal,
            _mandelbrotSet.palette().toNodeList(), _mandelbrotSet.state().deadRegions(),
            "imageComplete", "imageExportProgress", 100);
    });


    exportButton.onclick = function () {
        exportDimensions = _exportDimensions.dimensions();
        _dom.selectButton(exportButton);
        var roundedWidth = Math.floor(exportDimensions.width / 10);
        imageReporter.reportOn(roundedWidth, exportDimensions.height);
        var roundedHeight = Math.floor(exportDimensions.height / 10);
        histogramReporter.reportOn( roundedWidth, roundedHeight);
        timeReporter.start();
        console.log('Building histogram');
        if (exporting === true) {
            console.log("Can't export while export already in progress");
            return false ;
        }
        _histogramGenerator.run(_mandelbrotSet.state().getExtents(), exportDepth.value, roundedWidth, roundedHeight, "histogramExported", "histogramExportProgress",10);
        exporting = true;
    };
};

