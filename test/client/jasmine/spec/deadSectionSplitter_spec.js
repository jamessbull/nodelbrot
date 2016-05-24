describe("array splitter", function () {
    "use strict";

    it("should split an even array into a number of parts where each part is a number of rows", function () {
        var array = [0,1,2,3,4,5,6,7,8];
        var numberOfParts = 3;
        var partLength = 2;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1],[2,3],[4,5,6,7,8]]);
    });

    it("should split an uneven array into a number of parts", function () {
        var array = [0,1,2,3,4,5,6,7,8,9];
        var numberOfParts = 3;
        var partLength = 3;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1,2],[3,4,5],[6,7,8,9]]);
    });

    it("should split an uneven array into a number of parts", function () {
        var array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
        var numberOfParts = 2;
        var partLength = 3;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1,2,3,4,5],[6,7,8,9,10,11,12,13,14,15]]);
    });

    it("should split into a single part when array too small", function () {
        var array = [0,1,2,3,4];
        var numberOfParts = 2;
        var partLength = 4;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1,2,3,4]]);
    });

    it("should split into a single part when array much too small", function () {
        var array = [0,1,2,3,4];
        var numberOfParts = 6;
        var partLength = 5;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1,2,3,4]]);
    });

    it("should split into correct number of equal parts when possible", function () {
        var array = [0,1,2,3,4,5,6,7,8];
        var numberOfParts = 3;
        var partLength = 3;
        var sectionSplitter = jim.common.arraySplitter.create();
        expect(sectionSplitter.split(array, numberOfParts, partLength)).toEqual([[0,1,2],[3,4,5],[6,7,8]]);
    });

    it("number of rows in each part should be one when there are not enugh rows to fulfill the requested number of parts", function () {
        var array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
        var numberOfParts = 6;
        var partLength = 3;
        var expectedRows = 1;
        var sectionSplitter = jim.common.arraySplitter.create();
        var splitArray = sectionSplitter.split(array, numberOfParts, partLength);
        expect(splitArray[0].length).toBe(expectedRows * partLength);
    });

    it("number of rows in each part should be one when there are not enough rows to fulfill the requested number of parts", function () {
        var array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
        var numberOfParts = 2;
        var partLength = 3;
        var expectedRows = 2;
        var expectedRowsSecondPart = 3;
        var sectionSplitter = jim.common.arraySplitter.create();
        var splitArray = sectionSplitter.split(array, numberOfParts, partLength);
        expect(splitArray[0].length).toBe(expectedRows * partLength);
        expect(splitArray[1].length).toBe(expectedRowsSecondPart * partLength);
    });

    it("number of rows in each part should be one when there are exactly enough rows", function () {
        var array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
        var numberOfParts = 6;
        var partLength = 3;
        var expectedRows = 1;
        var sectionSplitter = jim.common.arraySplitter.create();
        var splitArray = sectionSplitter.split(array, numberOfParts, partLength);
        expect(splitArray[0].length).toBe(expectedRows * partLength);
    });


    it("number of rows in each part should be floor (total rows / numParts) ", function () {
        var array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
        var numberOfParts = 4;
        var partLength = 7;
        var expectedRows = 1;
        // expect three rows of one and one row of 4
        var expectedRows2 = 4;
        var sectionSplitter = jim.common.arraySplitter.create();
        var splitArray = sectionSplitter.split(array, numberOfParts, partLength);

        expect(splitArray.length).toBe(3);
        expect(splitArray[0].length).toBe(expectedRows * partLength);
        expect(splitArray[1].length).toBe(expectedRows * partLength);
        expect(splitArray[2].length).toBe(expectedRows * partLength);
    });

    it("number of rows in each part should be floor (total rows / numParts) ", function () {
        var array = [];
        for (var i = 0 ; i < 735 * 420; i+=1) {
            array.push(i);
        }
        var numberOfParts = 10;
        var partLength = 735;
        var chunkLength = 42 * 735;

        var sectionSplitter = jim.common.arraySplitter.create();
        var splitArray = sectionSplitter.split(array, numberOfParts, partLength);

        expect(splitArray.length).toBe(10);
        expect(splitArray[0].length).toBe(chunkLength);
        expect(splitArray[1].length).toBe(chunkLength);
        expect(splitArray[2].length).toBe(chunkLength);
        expect(splitArray[3].length).toBe(chunkLength);
        expect(splitArray[4].length).toBe(chunkLength);
        expect(splitArray[5].length).toBe(chunkLength);
        expect(splitArray[6].length).toBe(chunkLength);
        expect(splitArray[7].length).toBe(chunkLength);
        expect(splitArray[8].length).toBe(chunkLength);
        expect(splitArray[9].length).toBe(chunkLength);

        expect(splitArray[0][0]).toBe(0);
        expect(splitArray[0][1]).toBe(1);
        expect(splitArray[0][2]).toBe(2);
        expect(splitArray[0][3]).toBe(3);
        expect(splitArray[0][4]).toBe(4);

        expect(splitArray[1][0]).toBe(chunkLength);
        expect(splitArray[1][1]).toBe(chunkLength + 1);
        expect(splitArray[1][2]).toBe(chunkLength + 2);
        expect(splitArray[1][3]).toBe(chunkLength + 3);
        expect(splitArray[1][4]).toBe(chunkLength + 4);
    });


});