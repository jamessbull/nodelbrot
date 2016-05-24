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

        histoGenerator.run(extents, 10, 3, 9, "singlePart", 1);
        histoGeneratorManyParts.run(extents, 10, 3, 9, "multiPart", 3);
    });

});