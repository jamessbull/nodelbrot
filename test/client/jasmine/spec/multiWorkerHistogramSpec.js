describe("the multiworker histogram", function () {
    "use strict";
    it("should get the same result when it is split", function (done) {
        var extents  = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var histoGenerator = jim.parallelHistogramGenerator.create();
        var histoGeneratorManyParts = jim.parallelHistogramGenerator.create();
        var singleDone = false;
        var multiDone = false;
        var singleResult;
        var multiResult;

        events.listenTo("singlePart", function (result) {
            singleDone = true;
            singleResult = result;
            if(multiDone) {
                events.fire("bothDone");
            }
        });

        events.listenTo("multiPart", function (result) {
            multiDone = true;
            multiResult = result;
            if (singleDone) {
                events.fire("bothDone");
            }
        });

        events.listenTo("bothDone", function () {
            expect(singleResult.histogramTotal).toBe(multiResult.histogramTotal);
            multiResult.histogramData.forEach(function (number, index) {
                expect(singleResult.histogramData[index]).toBe(number);
            });
            done();
        });

        histoGenerator.run(extents, 10, 3, 9, "singlePart", "progressReport", 1);
        histoGeneratorManyParts.run(extents, 10, 3, 9, "multiPart", "progressReport", 3);
    });

});

describe("the parallel image generator", function () {
    "use strict";
    it("should correctly report the number of pixels it has processed correctly", function (done) {
        var extents  = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var imageGenerator = jim.parallelImageGenerator.create();
        var totalPixelsReported = 0;

        events.listenTo("progressMade", function (numberDone) {
            totalPixelsReported += numberDone;
        });

        events.listenTo("imageComplete", function (result) {
            expect(totalPixelsReported).toBe(27);
            done();
        });
        var histogramData = [0,1,2,3,4,5,6,7,8,9];
        var histogramTotal = 45;
        var nodeList = jim.palette.create().toNodeList();
        var deadRegions = [];
        for(var i = 0 ; i < 700 * 400; i +=1) {
            deadRegions.push(false);
        }
        imageGenerator.run(extents, 10, 3, 9, histogramData, histogramTotal, nodeList, deadRegions, "imageDone", "progressMade", 3);

    });
});