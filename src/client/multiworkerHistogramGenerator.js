
namespace("jim.parallelHistogramGenerator.message");
jim.parallelHistogramGenerator.message.create = function (_iter, _width, _height, _extents, _offset) {
    "use strict";

    return {
        maxIterations: _iter,
        exportWidth: _width,
        exportHeight: _height,
        mx: _extents.topLeft().x,
        my: _extents.topLeft().y,
        mw: _extents.width(),
        mh: _extents.height(),
        offset: _offset
    };
};

jim.parallelHistogramGenerator.create = function () {
    "use strict";
    var newJob = jim.parallelHistogramGenerator.message.create;

    return {
        run: function (_extents, _iter, _width, _height, _numberOfParts) {

            var jobs = [];
            var linesPerJob = _height / _numberOfParts;
            function job (i) {
                var lineHeight = _extents.height()/_height;
                var jobHeight = linesPerJob * lineHeight;
                var x = _extents.topLeft().x;
                var y = _extents.topLeft().y + (i * jobHeight);
                var width = _extents.width();
                var jobHeight2 = jobHeight;
                var extents = jim.rectangle.create(x, y, width,jobHeight2);
                var offset = (i * linesPerJob) * _width;
                return newJob(_iter, _width, linesPerJob, extents, offset);
            }

            for (var i = 0 ; i < _numberOfParts; i +=1) {
                jobs[i] = job(i);
            }
            return jobs;
        }
    };
};

namespace("jim.parallelImageGenerator.message");
jim.parallelImageGenerator.message.create = function (_iter, _width, _height, _extents, _deadRegions, _currentPosition) {
    "use strict";

    return {
        currentPosition: _currentPosition,
        deadRegions: _deadRegions,
        maxIterations: _iter,
        exportWidth: _width,
        exportHeight: _height,
        mx: _extents.topLeft().x,
        my: _extents.topLeft().y,
        mw: _extents.width(),
        mh: _extents.height()
    };
};

jim.parallelImageGenerator.create = function () {
    "use strict";
    var newJob = jim.parallelImageGenerator.message.create;

    return {
        run: function (_extents, _iter, _width, _height, _deadRegions, _numberOfParts) {
            console.log("Beginning image generation");

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

            var splitter = jim.common.arraySplitter.create();
            var deadSections = splitter.split(_deadRegions, _numberOfParts, 700);
            for (var i = 0 ; i < _numberOfParts; i +=1) {
                var chunk = jim.rectangle.create(currentChunkX, currentChunkY, regularChunkWidth, isLast(i) ? finalChunkHeight : regularChunkHeight);
                var height = isLast(i) ? numberOfLinesInFinalChunk : regularLinesPerChunk;
                var job = newJob(_iter, _width,  height, chunk, deadSections[i], 0);
                job.offset = (i * regularLinesPerChunk) * _width * 4;
                jobs[i] = job;
                currentChunkY = currentChunkY + (regularChunkOffset);
            }
            return jobs;
        }
    };
};
