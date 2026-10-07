// Divides a columns x rows image of the rectangle at (mx, my), mw by mh, into fragments for workers.
// A fragment is a set of rows: firstRow, then every rowStride-th row, rows of them. Its extents give the
// whole image's top left and the distance between pixels, plus firstRow and rowStride, so a pixel's
// position depends only on its row and column, not on how the image was divided.
export function renderFragments(mx, my, mw, mh, columns, rows) {
    const stepSizeX = mw / (columns - 1);
    const stepSizeY = mh / (rows - 1);

    function fragment(firstRow, rowStride, count) {
        return {
            rows: count,
            columns: columns,
            firstRow: firstRow,
            rowStride: rowStride,
            extents: {
                mx: mx,
                my: my,
                stepX: stepSizeX,
                stepY: stepSizeY,
                firstRow: firstRow,
                rowStride: rowStride
            },
            offset: firstRow * columns
        };
    }

    return {
        // noOfParts blocks of consecutive rows, the last taking any left over.
        split: function (noOfParts) {
            const rowsInAChunk = Math.floor(rows / noOfParts);
            const parts = [];
            for (let i = 0; i < noOfParts; i += 1) {
                const isFinalPart = i === noOfParts - 1;
                parts[i] = fragment(i * rowsInAChunk, 1, isFinalPart ? rows - (i * rowsInAChunk) : rowsInAChunk);
            }
            return parts;
        },
        // noOfParts sets of rows, each taking every noOfParts-th row, so expensive and cheap parts of
        // the image are shared out evenly.
        interleave: function (noOfParts) {
            const parts = [];
            for (let i = 0; i < noOfParts; i += 1) {
                parts[i] = fragment(i, noOfParts, Math.max(0, Math.ceil((rows - i) / noOfParts)));
            }
            return parts;
        }
    };
}

export function exportMessage(renderFragment, iter) {
    return {
        workerMessageType: "imageexportworker",
        offset: renderFragment.offset * 4,
        exportWidth: renderFragment.columns,
        exportHeight: renderFragment.rows,
        extents: renderFragment.extents,
        maxIterations: iter
    };
}

// Only the first histogramFilledLength entries of the histogram are sent (all of it if not given);
// the worker treats the rest, up to histogramLength, as zero.
export function interactiveMessage(fragment, histogram, currentIteration, stepSize, palette, histogramTotal, histogramFilledLength) {
    const filledLength = histogramFilledLength === undefined ? histogram.length : histogramFilledLength;
    const histogramData = histogram.slice(0, filledLength).buffer;
    return {
        workerMessageType: "uiworker",
        firstRow: fragment.firstRow,
        rowStride: fragment.rowStride,
        exportWidth : fragment.columns,
        exportHeight : fragment.rows,
        extents: fragment.extents,
        histogramDataBuffer: histogramData,
        histogramLength: histogram.length,
        currentIteration : currentIteration,
        iterations : stepSize,
        paletteNodes: palette,
        histogramTotal : histogramTotal,
        transfer: [histogramData]
    };
}
