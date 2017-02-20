describe("the multiworker histogram", function () {
    "use strict";
    it("should be the same as the combined worker histogram", function (done) {
        var calculation = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var calculation2 = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var source = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var dest = jim.rectangle.create(0,0,700, 400);

        function compareWithMultiWorkerHistogram (previousData) {
            calculation2.calculate(source, dest, 1000, 2, 2, function (_data, _total) {
                for(var i = 0 ; i < 100 ; i +=1) {
                    //console.log("multipart  : " + _data[i]);
                    //console.log("single job : " + previousData[i]);
                    expect(_data[i]).toBe(previousData[i]);
                }
                done();
            });
        }

        calculation.calculate(source, dest, 1000, 1, 1, function (_data, _total) {
            compareWithMultiWorkerHistogram(_data);
        });

    });

    it("should cover the same points regardless of how many pieces the job is split into", function () {
        var source = jim.rectangle.create(-2.5, -1, 3.5, 2);

        var singleJob = jim.parallelHistogramGenerator.create().run(source, 1000,700, 400, 1);
        var twoJobs = jim.parallelHistogramGenerator.create().run(source, 1000, 700, 400, 2);

        var one = singleJob[0];
        var two = twoJobs[0];
        var twotwo = twoJobs[1];
        expect(one.mh).toBe(2);
        expect(one.my).toBe(-1);

        expect(two.mh).toBe(1);
        expect(two.my).toBe(-1);

        expect(twotwo.mh).toBe(1);
        expect(twotwo.my).toBe(0);

    });

    it("should hit the same mx my points for two jobs and one", function (done) {
        var calculation = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var calculation2 = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var source = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var dest = jim.rectangle.create(0,0,700, 400);

        function compareWithMultiWorkerHistogram (mxVals, myVals) {
            calculation2.calculate(source, dest, 100, 2, 2, function (_data, _total, mxValues, myValues) {
                for(var i = 130000 ; i <141000 ; i +=1) {
                    expect(mxValues[i]).toBe(mxVals[i]);
                    expect(myValues[i]).toBe(myVals[i]);
                    if(mxValues[i] !== mxVals[i] || myValues[i] !== myVals[i]) {
                        console.log("index :- " + i + ", multipart   mx :- " + mxValues[i] + ", my :- " + myValues[i]);
                        console.log("index :- " + i + ", singlePart  mx :- " + mxVals[i]   + ", my :- " + myVals[i]);
                        break;
                    }


                }
                done();
            });
        }

        calculation.calculate(source, dest, 100, 1, 1, function (_data, _total, mxValues, myValues) {
            compareWithMultiWorkerHistogram(mxValues, myValues);
        });

    });
});