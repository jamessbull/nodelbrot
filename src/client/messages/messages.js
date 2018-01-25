
namespace("jim.messages.renderFragment2");
jim.messages.renderFragment2.create = function (_offset, _mx, _my, _mw, _mh, _columns, _rows) {
    "use strict";

    function newMessage(_currentChunk, _noOfChunks) {
        var isFinalPart = _currentChunk === (_noOfChunks - 1);
        var numberOfRowsInAChunk = Math.floor(_rows / _noOfChunks);
        var numberOfRowsInFinalChunk = _rows - ((_noOfChunks - 1) * numberOfRowsInAChunk);
        var stepSizeY = _mh / (_rows - 1);
        var stepSizeX = _mw / (_columns - 1);
        return {
            rows: isFinalPart ? numberOfRowsInFinalChunk : numberOfRowsInAChunk,
            columns:_columns,
            extents: {
                mx: _mx,
                my: _my + (numberOfRowsInAChunk * _currentChunk * stepSizeY),
                stepX: stepSizeX,
                stepY: stepSizeY
            },

            offset: numberOfRowsInAChunk * _currentChunk * _columns
        };
    }

    return {
        split: function( _noOfParts ) {
            var messages = [];

            for (var i  = 0; i < _noOfParts; i +=1) {
                messages[i] = newMessage(i, _noOfParts);
            }

            return messages;
        }
    };
};

namespace(("jim.messages.export"));
jim.messages.export.create = function exportJob (_renderFragment, _iter, _deadRegions) {
    "use strict";
    return {
        workerMessageType: "imageexportworker",
        offset: _renderFragment.offset * 4,
        exportWidth: _renderFragment.columns,
        exportHeight: _renderFragment.rows,
        extents: _renderFragment.extents,
        deadRegions: _deadRegions,
        maxIterations: _iter
    };
};

namespace(("jim.messages.interactive"));
jim.messages.interactive.create = function (_fragment, copyOfHisto, currentIteration, stepSize, palette, histogramTotal) {
    "use strict";
    return {
        workerMessageType: "uiworker",
        offset: _fragment.offset * 4,
        exportWidth : _fragment.columns,
        exportHeight : _fragment.rows,
        extents: _fragment.extents,
        deadRegions: [],
        histogramDataBuffer: new Uint32Array(copyOfHisto).buffer,
        currentIteration : currentIteration,
        iterations : stepSize,
        paletteNodes: palette,
        histogramTotal : histogramTotal
    };
};