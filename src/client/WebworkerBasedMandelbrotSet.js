namespace("jim.mandelbrot.webworkerInteractive");
jim.mandelbrot.webworkerInteractive.create = function (_width, _height, _events, _stepSize, _parallelism) {
    "use strict";

    var pool = jim.worker.pool.create(_parallelism, "/js/combinedWorker.js", [], "none", "histogramDataBuffer");
    var array = jim.common.array;

    var shouldPublishEscapeValues = false;
    var copyOfHisto = new Uint32Array(250000);
    var histogramTotal = 0;
    var stepSize = _stepSize;
    var currentIteration = 0;
    var extents = null;
    var palette = null;
    var escapeValues;
    var running = true;

    function onEachJob(_msg) {
        _events.fire(_events.histogramUpdateReceivedFromWorker, {update: new Uint32Array(_msg.histogramUpdate), currentIteration: currentIteration});
        if (shouldPublishEscapeValues) {
            _events.fire(_events.escapeValuesPublished, new Uint32Array(_msg.escapeValues));
            shouldPublishEscapeValues = false;
        }
        escapeValues = new Uint32Array(_msg.escapeValues);
        _events.fire(_events.renderImage, {imgData: new Uint8ClampedArray(_msg.imageDataBuffer), offset: _msg.offset});
    }

    function onAllJobsComplete() {
        _events.fire(_events.maxIterationsUpdated, currentIteration);
        currentIteration += stepSize;
        _events.fire(_events.frameComplete);

        if(running) postMessage();
        palette = undefined;
        extents = undefined;
    }

    function postMessage() {
        var msg = {
            offset: 0,
            exportWidth :_width,
            exportHeight :_height,
            histogramDataBuffer: copyOfHisto.buffer,
            currentIteration : currentIteration,
            iterations : stepSize,
            extents: extents,
            paletteNodes: palette,
            histogramTotal : histogramTotal
        };
        var mx = extents ? extents.mx : undefined;
        var my = extents ? extents.my : undefined;
        var mw = extents ? extents.mw : undefined;
        var mh = extents ? extents.mh : undefined;
        var initialRenderDefinition = jim.messages.renderFragment.create(0, mx, my, mw, mh, _width, _height);

        var fragments = initialRenderDefinition.split(_parallelism);
        if(palette !== undefined) {
            console.log("palette does not equal null");
        }
        var jobs = array(fragments.length, function (i) {
            return jim.messages.interactive.create(fragments[i].asMessage(), copyOfHisto, currentIteration, stepSize, palette, histogramTotal);
        });

        pool.consume(jobs, onEachJob, onAllJobsComplete);
    }


    function extentsTransfer(x, y, w, h) {
        return {mx: x, my: y, mw: w, mh: h};
    }

    on(_events.requestEscapeValues, function () {
        shouldPublishEscapeValues = true;
    });

    on(_events.paletteChanged, function (_palette) {
        console.log("palette updated");
        if (_palette === null || _palette === undefined) {
            console.log("Palette being set with an undefined value");
        }
        palette = _palette.toNodeList();
    });

    on(_events.extentsUpdate, function (_extents) {
        copyOfHisto = new Uint32Array(250000);
        currentIteration = 0;
        extents = extentsTransfer(_extents.topLeft().x, _extents.topLeft().y, _extents.width(), _extents.height());
        console.log("Calling post from extents update");
        postMessage(); // why?
        palette = undefined;
        extents = undefined;
    });

    on(_events.histogramUpdated, function (info) {
        copyOfHisto = info.array;
        histogramTotal = info.total;
    });

    return {
        stop: function () {
            running = false;
        },
        start: function () {
            running = true;
            postMessage();
        },
        destroy: function () {
            worker.terminate();
        }, escapeValues: function () {return escapeValues;}
    };
};

// So on extents transfer set a flag to say dont do anything with next message