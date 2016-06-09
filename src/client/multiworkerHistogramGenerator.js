namespace("jim.parallelHistogramGenerator.message");
jim.parallelHistogramGenerator.message.create = function (_iter, _width, _height, _extents) {
    "use strict";
    return {
        maxIterations: _iter,
        exportWidth: _width,
        exportHeight: _height,
        mx: _extents.topLeft().x,
        my: _extents.topLeft().y,
        mw: _extents.width(),
        mh: _extents.height()
    };
};

jim.parallelHistogramGenerator.create = function () {
    "use strict";
    var newJob = jim.parallelHistogramGenerator.message.create;
    var newRunner = jim.parallel.jobRunner.create;
    var eventToFire = "histogramComplete";

    var runner = newRunner(events, "/js/histogramCalculatingWorker.js");

    events.listenTo("jim.histogramGenerator.parallelJob", function (jobs) {
        var completeHistogramData = [];
        var completeHistogramTotal = 0;
        jobs.forEach(function (job) {
            completeHistogramTotal += job.result.histogramTotal;
            job.result.histogramData.forEach(function (datum, index) {
                if(!completeHistogramData[index]) {
                    completeHistogramData[index] = 0;
                }
                completeHistogramData[index] = completeHistogramData[index] + datum;
            });
        });
        console.log("Histogram generation complete");
        events.fire(eventToFire, {histogramData: completeHistogramData, histogramTotal: completeHistogramTotal});
    });

    return {
        run: function (_extents, _iter, _width, _height, _eventToFire, _progressEvent, _numberOfParts) {
            if (_eventToFire) {
                eventToFire = _eventToFire;
            }

            var jobs = [];
            var partHeight = _height / _numberOfParts;
            for (var i = 0 ; i < _numberOfParts; i +=1) {
                var offset = _extents.height()/(_height - 1);
                var startY = _extents.topLeft().y + (partHeight * i * offset);
                var r = jim.rectangle.create(_extents.topLeft().x, startY, _extents.width(), (partHeight-1) * offset);
                jobs[i] = newJob(_iter, _width, partHeight, r);
            }
            runner.run(jobs, "jim.histogramGenerator.parallelJob", _progressEvent);
        }
    };
};

namespace("jim.parallelImageGenerator.message");
jim.parallelImageGenerator.message.create = function (_iter, _width, _height, _extents, _histogramData, _histogramTotal, _nodeList, _deadRegions) {
    "use strict";
    return {
        deadRegions: _deadRegions,
        histogramData: _histogramData,
        histogramSize: _histogramData.length,
        histogramTotal: _histogramTotal,
        maxIterations: _iter,
        exportWidth: _width,
        exportHeight: _height,
        mx: _extents.topLeft().x,
        my: _extents.topLeft().y,
        mw: _extents.width(),
        mh: _extents.height(),
        paletteNodes: _nodeList
    };
};

jim.parallelImageGenerator.create = function () {
    "use strict";
    var newJob = jim.parallelImageGenerator.message.create;
    var newRunner = jim.parallel.jobRunner.create;
    var eventToFire = "imageComplete";
    var data;
    var runner = newRunner(events, "/js/mandelbrotImageCalculatingWorker.js");
    events.listenTo("jim.parallelimagegenerator.imageDone", function (jobs) {
        var tmpData = [];
        jobs.forEach(function (job) {
            var arr = job.result.imgData;
            for (var i = 0; i < arr.length; i += 1) {
                tmpData.push(arr[i]);
            }
        });
        var i = 0;
        var length = data.length;

        for (i = 0; i <length; i +=1) {
            data[i] = tmpData[i];
        }
        events.fire(eventToFire, {imgData: data});
    });
    return {
        run: function (_extents, _iter, _width, _height,  _histogramData, _histogramTotal, _nodeList, _deadRegions,  _eventToFire, _progressEvent, _numberOfParts) {
            console.log("Beginning image generation");
            if (_eventToFire) {
                eventToFire = _eventToFire;
            }
            var regularChunkWidth = _extents.width();
            var chunkSizePerLine = _extents.height()/ (_height - 1 ); // why -1?
            var regularLinesPerChunk = Math.floor(_height / _numberOfParts);
            var remainderLines = _height % _numberOfParts;
            var numberOfLinesInFinalChunk = regularLinesPerChunk + remainderLines;
            var regularChunkHeight = chunkSizePerLine * (regularLinesPerChunk - 1);
            var regularChunkOffset = chunkSizePerLine * (regularLinesPerChunk);
            var finalChunkHeight = chunkSizePerLine * (numberOfLinesInFinalChunk -1);
            var currentChunkX = _extents.topLeft().x;
            var currentChunkY = _extents.topLeft().y;
            var isLast = function (x) {
                return x === _numberOfParts - 1;
            };
            var jobs = [];
            data = new Uint8ClampedArray(_height * _width * 4);

            var splitter = jim.common.arraySplitter.create();
            var deadSections = splitter.split(_deadRegions, _numberOfParts, 700);
            for (var i = 0 ; i < _numberOfParts; i +=1) {
                var chunk = jim.rectangle.create(currentChunkX, currentChunkY, regularChunkWidth, isLast(i) ? finalChunkHeight : regularChunkHeight);
                jobs[i] = newJob(_iter, _width,  isLast(i) ? numberOfLinesInFinalChunk : regularLinesPerChunk, chunk, _histogramData, _histogramTotal, _nodeList, deadSections[i]);
                currentChunkY = currentChunkY + (regularChunkOffset);
            }

            runner.run(jobs, "jim.parallelimagegenerator.imageDone", _progressEvent);
        }
    };
};
