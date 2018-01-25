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

var workerFiles = [
    "../src/client/common.js",
    "../src/client/mandelbrotPoint.js",
    '../src/client/tinycolor.js',
    "../src/client/palette.js",
    "../src/client/histogram.js",
    '../src/client/mandelbrotEscape.js',
    "../src/client/setProcessor.js",
    "../src/client/uiWorker.js",
    "../src/client/histogramExportWorker.js",
    "../src/client/imageExportWorker.js"
];


function concatFiles(files) {
    var content = ""
    files.forEach((fileName) => {
        var file = fs.readFileSync(fileName);
        content += file + "\n";
    });
    return content;
}

function buildWorker(location) {
    var workerFileContent = concatFiles(workerFiles);
    var unifiedworkerContent = fs.readFileSync("../src/client/unifiedworker.js", "utf8");
    var modifiedUnifiedWorkerContent = unifiedworkerContent.replace(/importScripts[\s\S]*var u/, "var u");
    var fullContent = workerFileContent + "\n" + modifiedUnifiedWorkerContent;
    fs.writeFileSync(location, fullContent);
}

function loadFile(name) {
    return fs.readFileSync(name, 'utf8');
}

function removeScriptTags(html) {
    return html.replace(/<script.*<\/script>\n/g,"");
}

function processedHead() {
    var head = "../src/view/templates/homePage/head.hbl";
    return removeScriptTags(loadFile(head));
}

function processedBody() {
    var body = "../src/view/templates/homePage/body.hbl";
    var bodyMarkup = loadFile(body);
    var js = concatFiles(uiFiles);
    var allJs = js + "\n" + "jim.init.run();\n";

    console.log("All js is");
    console.log("***********************");
    console.log(allJs);
    console.log("***********************");

    return bodyMarkup.replace(/jim.init.run\(\);/, allJs);
}

function fullHtml(head, body) {
    var html = "../src/view/templates/html.hbl";
    var htmlMarkup = loadFile(html);
    htmlMarkup = htmlMarkup.replace(/{{{head}}}/, head);
    return htmlMarkup.replace(/{{{body}}}/, body);
}

function buildUI(location) {
    var html = fullHtml(processedHead(), processedBody());
    fs.writeFileSync(location, html);
}

buildWorker("../latest/js/unifiedworker.js");
buildUI("../latest/mandelbrotExplorer.html");

