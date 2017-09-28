// Start design from scratch
// so to render the set I need to send a chunk to each worker.
// I need a number from the set for each line I want to render.
// A chunk is
// Chunk
//  Mandelbrot start x
//  Mandelbrot start y
//  Number of rows to render
//  number of columns to render
//  Step size x
//  Step size Y
//  renderOffset
//
//  Only split when extents are present

// send chunk to worker
// worker starts at mandelbrotstart x and y
// worker continues and adds x step and then y step up to
// for loops from 0 to col and 0 to no Rows
// Calculate mx and my from x, y and


namespace("jim.messages.renderFragment");
jim.messages.renderFragment.create = function (_offset, _mx, _my, _mw, _mh, _exportWidth, _exportHeight) {
    "use strict";
    function asMessage () {
        return {
            offset: _offset,
            extents: _mx !== undefined ? {mx: _mx, my: _my, mw: _mw, mh: _mh} : undefined,
            exportHeight: _exportHeight,
            exportWidth: _exportWidth
        };
    }

    // offset 744800 eh 134 ew 700
    //-2.5, 0.333, 3.5, 0.666
    function split (_numberOfParts) {
        var rowHeight = _mh/ (_exportHeight);

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
}