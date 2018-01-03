namespace("jim.mandelbrot.export.escapeHistogramCalculator");
jim.mandelbrot.export.escapeHistogramCalculator.create = function () {
    "use strict";
    function calculate (_source, _target, _depth, _noOfParts, _noOfWorkers, _onComplete) {

        function addFirstToSecond(arr1, arr2) {
            for(var i = 1; i <= arr1.length; i +=1){
                arr2[i] += arr1[i];
            }
        }

        function fragmentToHistogramMessage(fragment) {
            return {
                maxIterations: _depth,
                exportWidth: fragment.columns,
                exportHeight: fragment.rows,
                mx: fragment.extents.mx,
                my: fragment.extents.my,
                mw: fragment.extents.stepX,
                mh: fragment.extents.stepY,
                offset: fragment.offset
            };
        }

        var fullHistogramData = new Uint32Array(_depth + 1);
        var totalMxValues = new Float64Array(_target.width() * _target.height());
        var totalMyValues = new Float64Array(_target.width() * _target.height());
        var fullHistogramTotal = 0;
        var initialRenderDefinition = jim.messages.renderFragment2.create(0, _source.topLeft().x, _source.topLeft().y, _source.width(), _source.height(), _target.width(), _target.height());
        var fragments = initialRenderDefinition.split(_noOfParts);
        var chunkSize = _target.width() * _target.height() / _noOfParts;

        var jobs = fragments.map(function (fragment) {
            return fragmentToHistogramMessage(fragment);
        });
        var workerPool =  jim.worker.pool.create(_noOfWorkers, "/js/histogramCalculatingWorker.js", [], "");

        function addToMxValues(_vals, _offset) {
            for (var i = 0 ; i < _vals.length; i +=1) {
                totalMxValues[i + _offset] = _vals[i];
            }
        }
        function addToMyValues(_vals, _offset) {
            for (var i = 0 ; i < _vals.length; i +=1) {
                totalMyValues[i + _offset] = _vals[i];
            }
        }

        function onEveryJob(_msg) {
            var mxv = new Float64Array(_msg.result.mxValues);
            addToMxValues(mxv, _msg.offset);
            var myv = new Float64Array(_msg.result.myValues);
            addToMyValues(myv, _msg.offset);
            fullHistogramTotal += _msg.result.histogramTotal;
            addFirstToSecond(new Uint32Array(_msg.result.histogramData), fullHistogramData);
            events.fire("histogramExportProgress", chunkSize);
        }

        function onAllJobsComplete(_msg) {
            var h = jim.twoPhaseHistogram.create(fullHistogramData.length);
            h.setData(fullHistogramData, fullHistogramTotal);
            h.process();
            _onComplete(fullHistogramData, fullHistogramTotal, totalMxValues, totalMyValues);
            workerPool.terminate();
        }
        workerPool.consume(jobs, onEveryJob, onAllJobsComplete);
    }
    return {
        calculate: calculate
    };
};