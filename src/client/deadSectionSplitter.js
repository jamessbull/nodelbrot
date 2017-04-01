namespace("jim.common.arraySplitter");
jim.common.arraySplitter.create = function () {
    "use strict";
    return {
        split: function (arr, numberOfParts, rowLength) {
            var parts = [];
            var totalNumberOfRows = Math.floor(arr.length / rowLength);
            if (totalNumberOfRows < numberOfParts) {
                numberOfParts = totalNumberOfRows;
            }
            var rowsPerChunk = Math.floor(totalNumberOfRows / numberOfParts);
            var regularChunkSize = rowsPerChunk * rowLength;
            var finalChunkSize = 1 +(regularChunkSize + (totalNumberOfRows % rowsPerChunk))* rowLength;
            var lastOne = function (x) {
                return (x === (numberOfParts - 1));
            };
            for (var i = 0; i < numberOfParts; i +=1) {
                var startIndex = (regularChunkSize * i);
                var endIndex = startIndex + (lastOne(i) ? finalChunkSize : regularChunkSize);
                parts[i] = arr ? arr.slice(startIndex, endIndex) : [];
            }
            return parts;
        }
    };
};