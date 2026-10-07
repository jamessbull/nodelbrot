namespace("jim.mandelbrot.export");

// Renders extents (a rectangle in the complex plane) as a width x height image, iterating to depth and
// coloured with palette, without touching the page. Two phases run on one pool of jim.worker.count()
// workers: first a
// histogram of how many pixels escape at each iteration, from a sample of the image at a tenth of its
// size each way, then the image itself in strips, coloured against that histogram. Fires
// "histogramExportProgress" and "imageExportProgress" with the number of pixels done, and calls
// onComplete with the image's RGBA data.
jim.mandelbrot.export.render = function (extents, width, height, depth, palette, onComplete) {
    "use strict";
    var noOfWorkers = jim.worker.count();
    var histogramParts = 10;
    var imageParts = 100;
    var pool = jim.worker.pool.create(noOfWorkers, jim.worker.url);

    function fragments(columns, rows, parts) {
        return jim.messages.renderFragment2.create(0, extents.topLeft().x, extents.topLeft().y, extents.width(), extents.height(), columns, rows).split(parts);
    }

    function histogramPhase(onHistogram) {
        var sampleWidth = Math.floor(width / 10);
        var sampleHeight = Math.floor(height / 10);
        var histogram = new Uint32Array(depth + 1);
        var total = 0;
        var jobs = fragments(sampleWidth, sampleHeight, histogramParts).map(function (fragment) {
            return {
                workerMessageType: "histogramexportworker",
                maxIterations: depth,
                exportWidth: fragment.columns,
                exportHeight: fragment.rows,
                extents: fragment.extents
            };
        });
        pool.consume(jobs, function (msg) {
            var counts = new Uint32Array(msg.result.histogramData);
            for (var i = 1; i < counts.length; i += 1) {
                histogram[i] += counts[i];
            }
            total += msg.result.histogramTotal;
            events.fire("histogramExportProgress", sampleWidth * sampleHeight / histogramParts);
        }, function () {
            // The image phase needs cumulative counts: how many pixels had escaped by each iteration.
            for (var i = 1; i < histogram.length; i += 1) {
                histogram[i] += histogram[i - 1];
            }
            onHistogram(histogram, total);
        });
    }

    function imagePhase(histogram, total) {
        var nodes = palette.toNodeList();
        var blend = palette.blend();
        pool.sendToEach(function () {
            var histogramData = new Uint32Array(histogram).buffer;
            return {workerMessageType: "imageexportworker", updateHistogramData: true, paletteNodes: nodes, paletteBlend: blend,
                histogramData: histogramData, histogramTotal: total, transfer: [histogramData]};
        });
        var jobs = fragments(width, height, imageParts).map(function (fragment) {
            return jim.messages.export.create(fragment, depth);
        });
        var image = new Uint8ClampedArray(width * height * 4);
        pool.consume(jobs, function (msg) {
            image.set(new Uint8ClampedArray(msg.result.imgData), msg.result.offset);
            events.fire("imageExportProgress", width * height / imageParts);
        }, function () {
            pool.terminate();
            onComplete(image);
        });
    }

    histogramPhase(imagePhase);
};
