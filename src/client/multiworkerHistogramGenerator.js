
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
