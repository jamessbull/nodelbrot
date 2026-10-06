importScripts(
    '/js/common.js',
    '/js/mandelbrotPoint.js',
    '/js/tinycolor.js',
    '/js/palette.js',
    '/js/pixelIterator.js',
    '/js/uiWorker.js',
    '/js/histogramExportWorker.js',
    '/js/imageExportWorker.js'
);

var uiWorker = jim.uiWorker.create();
var histogramExportWorker = jim.histogramexportworker.create();
var imageExportWorker = jim.imageexportworker.create();

function messageOfType(e, wtype) {
    return e.data.workerMessageType === wtype;
}

onmessage = function (e) {
    if (messageOfType(e, "uiworker")) {
        uiWorker.onmessage(e);
    }
    if (messageOfType(e, "histogramexportworker")) {
        histogramExportWorker.onmessage(e);
    }
    if (messageOfType(e, "imageexportworker")) {
        imageExportWorker.onmessage(e);
    }
};