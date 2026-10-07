// Divides a columns x rows image of the rectangle at (_mx, _my), _mw by _mh, into fragments for workers.
// A fragment is a set of rows: firstRow, then every rowStride-th row, rows of them. Its extents give the
// whole image's top left and the distance between pixels, plus firstRow and rowStride, so a pixel's
// position depends only on its row and column, not on how the image was divided.
export function renderFragments(_mx, _my, _mw, _mh, _columns, _rows) {
    const stepSizeX = _mw / (_columns - 1);
    const stepSizeY = _mh / (_rows - 1);

    function fragment(firstRow, rowStride, rows) {
        return {
            rows: rows,
            columns: _columns,
            firstRow: firstRow,
            rowStride: rowStride,
            extents: {
                mx: _mx,
                my: _my,
                stepX: stepSizeX,
                stepY: stepSizeY,
                firstRow: firstRow,
                rowStride: rowStride
            },
            offset: firstRow * _columns
        };
    }

    return {
        // _noOfParts blocks of consecutive rows, the last taking any left over.
        split: function (_noOfParts) {
            const rowsInAChunk = Math.floor(_rows / _noOfParts);
            const parts = [];
            for (let i = 0; i < _noOfParts; i += 1) {
                const isFinalPart = i === _noOfParts - 1;
                parts[i] = fragment(i * rowsInAChunk, 1, isFinalPart ? _rows - (i * rowsInAChunk) : rowsInAChunk);
            }
            return parts;
        },
        // _noOfParts sets of rows, each taking every _noOfParts-th row, so expensive and cheap parts of
        // the image are shared out evenly.
        interleave: function (_noOfParts) {
            const parts = [];
            for (let i = 0; i < _noOfParts; i += 1) {
                parts[i] = fragment(i, _noOfParts, Math.max(0, Math.ceil((_rows - i) / _noOfParts)));
            }
            return parts;
        }
    };
}

export function exportMessage(_renderFragment, _iter) {
    return {
        workerMessageType: "imageexportworker",
        offset: _renderFragment.offset * 4,
        exportWidth: _renderFragment.columns,
        exportHeight: _renderFragment.rows,
        extents: _renderFragment.extents,
        maxIterations: _iter
    };
}

// Only the first histogramFilledLength entries of the histogram are sent (all of it if not given);
// the worker treats the rest, up to histogramLength, as zero.
export function interactiveMessage(_fragment, histogram, currentIteration, stepSize, palette, histogramTotal, histogramFilledLength) {
    const filledLength = histogramFilledLength === undefined ? histogram.length : histogramFilledLength;
    const histogramData = histogram.slice(0, filledLength).buffer;
    return {
        workerMessageType: "uiworker",
        firstRow: _fragment.firstRow,
        rowStride: _fragment.rowStride,
        exportWidth : _fragment.columns,
        exportHeight : _fragment.rows,
        extents: _fragment.extents,
        histogramDataBuffer: histogramData,
        histogramLength: histogram.length,
        currentIteration : currentIteration,
        iterations : stepSize,
        paletteNodes: palette,
        histogramTotal : histogramTotal,
        transfer: [histogramData]
    };
}
