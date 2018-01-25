// Here I want to stitch files together into one large file

var fs = require('fs');
var uiFiles = [
    "../src/client/common.js",
    "../src/client/events.js",
    "../src/client/mandelbrotPoint.js",
    "../src/client/stopWatch.js",
    "../src/client/tinycolor.js",
    "../src/client/palette.js",
    "../src/client/image.js",
    "../src/client/histogram.js",
    "../src/client/mandelbrotEscape.js",
    "../src/client/WebworkerBasedMandelbrotSet.js",
    "../src/client/anim.js",
    "../src/client/selection.js",
    "../src/client/ui/mandelbrotViewUIPolicy.js",
    "../src/client/ui/actions/drawSelection.js",
    "../src/client/ui/actions/zoomInAnimation.js",
    "../src/client/ui/actions/zoomOutAnimation.js",
    "../src/client/ui/actions/zoomIn.js",
    "../src/client/ui/actions/zoomOut.js",
    "../src/client/ui/actions/move.js",
    "../src/client/mandelbrot.js",
    "../src/client/colourPicker.js",
    "../src/client/colourGradient.js",
    "../src/client/messages/messages.js",
    "../src/client/deadSectionSplitter.js",
    "../src/client/export/exporter.js",
    "../src/client/uiElements.js",
    "../src/client/deadRegions.js",
    "../src/client/bookMark.js",
    "../src/client/exportDropdown.js",
    "../src/client/metrics.js",
    "../src/client/magnifiedDisplay.js",
    "../src/client/export/exportHistogramCreator.js"];

var histoFiles = [
    "../src/client/common.js",
    "../src/client/mandelbrotPoint.js",
    "../src/client/events.js",
    "../src/client/palette.js",
    "../src/client/histogram.js",
    "../src/client/setProcessor.js",
    "../src/client/histogramCalculatingWorker.js"
];
var exportFiles = [
    '../src/client/common.js',
    '../src/client/mandelbrotPoint.js',
    '../src/client/stopWatch.js',
    '../src/client/tinycolor.js',
    '../src/client/events.js',
    '../src/client/palette.js',
    '../src/client/histogram.js',
    '../src/client/mandelbrotEscape.js',
    '../src/client/selection.js',
    '../src/client/mandelbrot.js',
    '../src/client/colourPicker.js',
    '../src/client/setProcessor.js',
    '../src/client/mandelbrotImageCalculatingWorker.js'
];
var combinedFiles = [
    '../src/client/common.js',
    '../src/client/events.js',
    '../src/client/mandelbrotPoint.js',
    '../src/client/stopWatch.js',
    '../src/client/setProcessor.js',
    '../src/client/tinycolor.js',
    '../src/client/palette.js',
    '../src/client/histogram.js',
    '../src/client/mandelbrotEscape.js',
    '../src/client/combinedworker.js'
];

function concatFiles(files) {
    var content = ""
    files.forEach((fileName) => {
        var file = fs.readFileSync(fileName);
        content += file + "\n";
    });
    return content;
}

fs.writeFileSync("../latest/js/mandelbrotExplorer.js", concatFiles(uiFiles));
fs.writeFileSync("../latest/js/histogramCalculatingWorker.js", concatFiles(histoFiles));
fs.writeFileSync("../latest/js/mandelbrotImageCalculatingWorker.js", concatFiles(exportFiles));
fs.writeFileSync("../latest/js/combinedWorker.js", concatFiles(combinedFiles));
// write / close new file

