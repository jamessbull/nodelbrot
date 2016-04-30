

jim.parallel.job.create = function () {

};
namespace("jim.parallelHistogramGenerator.message");

jim.parallelHistogramGenerator.message.create = function (_iter, _width, _height, _extents) {
    "use strict";
    return {
        width: _width,
        iter: _iter,
        height: _height,
        extents: _extents
    };
};

//var histogramMessage = jim.multiworkerHistogramBuilder.message.create;

jim.parallelHistogramGenerator.create = function () {
    "use strict";
    var onComplete;
    var builders = {};
    builders.one = new Worker("/js/histogramCalculatingWorker.js");
    builders.two = new Worker("/js/histogramCalculatingWorker.js");
    builders.three = new Worker("/js/histogramCalculatingWorker.js");
    builders.four = new Worker("/js/histogramCalculatingWorker.js");
    //var buil


    return {
        runAnd: function (f) {
            onComplete = f;

        },
        exportDetails : function (exportMessage) {

        }

    };
};
