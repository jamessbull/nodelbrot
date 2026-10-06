// Here I want to stitch files together into one large file
var zlib = require('zlib');
var fs = require('fs');
var UglifyJS = require('uglify-js');

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
    "../src/client/pixelIterator.js",
    "../src/client/uiWorker.js",
    "../src/client/histogramExportWorker.js",
    "../src/client/imageExportWorker.js"
];


function removeStrict(code) {
    var strictDef = /"use strict";/g;
    return code.replace(strictDef, "");
}

function concatFiles(files) {
    var content = ""
    files.forEach((fileName) => {
        var file = fs.readFileSync(fileName);
        content += file + "\n";
    });
    return content;
}

// The worker is served next to the page in the built version, rather than under /js/.
var builtWorkerName = "unifiedworker.js";

function replaceWorkerPath(js) {
    return js.replace(/\/js\/unifiedworker.js/g, builtWorkerName);
}

function minify(js) {
    var result = UglifyJS.minify(js);
    if (result.error) {
        throw result.error;
    }
    return result.code;
}

function buildWorker(location) {
    var workerFileContent = concatFiles(workerFiles);
    var unifiedworkerContent = fs.readFileSync("../src/client/unifiedworker.js", "utf8");
    var modifiedUnifiedWorkerContent = unifiedworkerContent.replace(/importScripts[\s\S]*var u/, "var u");
    var fullContent = workerFileContent + "\n" + modifiedUnifiedWorkerContent;
    var contentWithoutUseStrict = removeStrict(fullContent);
    var minifiedJS = minify(replaceWorkerPath(contentWithoutUseStrict));
    fs.writeFileSync(location, minifiedJS);
}

function loadFile(name) {
    return fs.readFileSync(name, 'utf8');
}

function removeScriptTags(html) {
    return html.replace(/<script.*<\/script>\r?\n/g,"");
}

function processedHead() {
    var head = "../src/view/templates/homePage/head.hbl";
    return removeScriptTags(loadFile(head));
}

function processedBody() {
    var body = "../src/view/templates/homePage/body.hbl";
    var bodyMarkup = loadFile(body);
    var js = concatFiles(uiFiles);
    var allJs = js + "\n" + "window.fractal = jim.init.run();\n";
    var minifiedJS = minify(removeStrict(replaceWorkerPath(allJs)));
    return bodyMarkup.replace(/window.fractal = jim.init.run\(\);/, minifiedJS);
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

buildWorker("../latest/" + builtWorkerName);
buildUI("../latest/mandelbrotExplorer.html");

//var gzip = zlib.createGzip();
//var inp = fs.createReadStream("../latest/unifiedworker.js.min.unzipped");
//var out = fs.createWriteStream("../latest/unifiedworker.js.min");
//inp.pipe(gzip).pipe(out);
//
//var inp = fs.createReadStream("../latest/mandelbrotExplorer.html.unzipped");
//var out = fs.createWriteStream("../latest/mandelbrotExplorer.html");
//inp.pipe(gzip).pipe(out);