namespace("jim.mandelbrot.image.exporter");
jim.mandelbrot.image.exporter.create = function (_mandelbrotSet, _histogramGenerator, _dom) {
    "use strict";
    var exporting = false;

    var exportButton = document.getElementById("export");
    var exportHeight = document.getElementById("exportHeight");
    var exportWidth = document.getElementById("exportWidth");
    var exportDepth = document.getElementById("exportDepth");
    var histogramProgress = document.getElementById("histogramProgress");
    var imageProgress = document.getElementById("imageProgress");
    var timeProgress = document.getElementById("elapsedTime");
    var downloadButton = document.getElementById("export1");

    var imageGenerator = jim.parallelImageGenerator.create();

    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);


    var widthMultiplier = 700 / 400; //so when width is set multiply by this to get height
    var heightMultiplier = 400 / 700; // when height is set mult by this to get width

    exportHeight.onkeyup = function () {
        exportWidth.value = exportHeight.value * widthMultiplier;
    };
    exportWidth.onkeyup = function () {
        exportHeight.value = exportWidth.value * heightMultiplier;
    };

    events.listenTo("imageComplete", function (e) {
        _dom.deselectButton(exportButton);
        _dom.selectButton(downloadButton);
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth.value;
        exportCanvas.height = exportHeight.value;
        var context = exportCanvas.getContext('2d');
        var outImage = context.createImageData(exportCanvas.width, exportCanvas.height);
        outImage.data.set(e.imgData);
        context.putImageData(outImage, 0, 0);
        downloadButton.href = exportCanvas.toDataURL("image/png");
        exporting = false;
        timeReporter.stop();
    });

    events.listenTo("histogramExported", function (e) {
        console.log("Histogram exported");
        imageGenerator.run(_mandelbrotSet.state().getExtents(),
            exportDepth.value, exportWidth.value, exportHeight.value,
            e.histogramData, e.histogramTotal,
            _mandelbrotSet.palette().toNodeList(), _mandelbrotSet.state().deadRegions(),
            "imageComplete", "imageExportProgress", 100);
    });


    exportButton.onclick = function () {
        _dom.selectButton(exportButton);
        imageReporter.reportOn(exportWidth.value, exportHeight.value);
        histogramReporter.reportOn(exportWidth.value / 10, exportHeight.value / 10);
        timeReporter.start();
        console.log('Building histogram');
        if (exporting === true) {
            console.log("Can't export while export already in progress");
            return false ;
        }
        _histogramGenerator.run(_mandelbrotSet.state().getExtents(), exportDepth.value, exportWidth.value / 10, exportHeight.value / 10, "histogramExported", "histogramExportProgress",10);
        exporting = true;
    };
};

