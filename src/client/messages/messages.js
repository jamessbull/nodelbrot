namespace("jim.messages.renderFragment");
jim.messages.renderFragment.create = function (_offset, _mx, _my, _mw, _mh, _exportWidth, _exportHeight) {
    "use strict";
    function asMessage () {
        return {
            offset: _offset,
            extents: {mx: _mx, my: _my, mw: _mw, mh: _mh},
            exportHeight: _exportHeight,
            exportWidth: _exportWidth
        };
    }
    function split (_numberOfParts) {
        var rowHeight = _mh/ (_exportHeight - 1 );

        var rowsInAChunk = Math.floor(_exportHeight / _numberOfParts);
        var chunkHeight = rowHeight * (rowsInAChunk - 1);

        var rowsInLastChunk = rowsInAChunk + (_exportHeight % _numberOfParts);
        var finalChunkHeight = rowHeight * (rowsInLastChunk -1);

        var distanceToNextChunk = rowHeight * (rowsInAChunk);
        var chunkY = _my;

        var fragments = [];

        for (var i = 0 ; i < _numberOfParts; i +=1) {
            var last = (i === (_numberOfParts - 1));
            var exportHeight = last ? rowsInLastChunk : rowsInAChunk;
            var actualChunkHeight = last ? finalChunkHeight : chunkHeight;
            var offset = (i * rowsInAChunk) * _exportWidth * 4;
            var fragment = jim.messages.renderFragment.create(offset, _mx, chunkY, _mw, actualChunkHeight, _exportWidth, exportHeight);
            fragments[i] = fragment;
            chunkY += distanceToNextChunk;
        }
        return fragments;
    }

    return {
        asMessage: asMessage,
        split: split
    };
};
namespace(("jim.messages.export"));
jim.messages.export.create = function exportJob (_renderFragment, _iter, _deadRegions) {
    "use strict";
    var fragment = _renderFragment.asMessage();
    return {
        offset: fragment.offset,
        exportWidth: fragment.exportWidth,
        exportHeight: fragment.exportHeight,
        extents: fragment.extents,
        deadRegions: _deadRegions,
        maxIterations: _iter
    };
};

namespace(("jim.messages.interactive"));
jim.messages.interactive.create = function (_fragment, copyOfHisto, currentIteration, stepSize, palette, histogramTotal, _offset, _deadRegions) {
    "use strict";
    return {
        offset: _offset,
        exportWidth : _fragment.exportWidth,
        exportHeight : _fragment.exportHeight,
        extents: _fragment.extents,
        deadRegions: _deadRegions,
        histogramDataBuffer: copyOfHisto.buffer,
        currentIteration : currentIteration,
        iterations : stepSize,
        paletteNodes: palette,
        histogramTotal : histogramTotal
    };
}