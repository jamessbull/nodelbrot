namespace("jim.mandelbrot.export.escapeHistogramCalculator");
jim.mandelbrot.export.escapeHistogramCalculator.create = function () {
    "use strict";
    function calculate (_source, _target, _depth, _noOfParts, _noOfWorkers, _onComplete) {

        function addFirstToSecond(arr1, arr2) {
            for(var i = 1; i <= arr1.length; i +=1){
                arr2[i] += arr1[i];
            }
        }

        var fullHistogramData = new Uint32Array(_depth + 1);
        var fullHistogramTotal = 0;
        var jobs = jim.parallelHistogramGenerator.create().run(_source, _depth, _target.width(), _target.height(), _noOfParts);
        var workerPool =  jim.worker.pool.create(_noOfWorkers, "/js/histogramCalculatingWorker.js", [], "");

        function onEveryJob(_msg) {
            fullHistogramTotal += _msg.result.histogramTotal;
            addFirstToSecond(new Uint32Array(_msg.result.histogramData), fullHistogramData);
            events.fire("histogramExportProgress", 280);
        }

        function onAllJobsComplete(_msg) {
            var h = jim.twoPhaseHistogram.create(fullHistogramData.length);
            h.setData(fullHistogramData, fullHistogramTotal);
            h.process();
            _onComplete(fullHistogramData, fullHistogramTotal);
        }
        workerPool.consume(jobs, onEveryJob, onAllJobsComplete);
    }
    return {
        calculate: calculate
    };
};