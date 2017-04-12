describe("the multiworker histogram", function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
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

describe("The combined worker", function () {
    "use strict";

    var expectedHistogramValuesForTwentyIterations =
        [0, 0, 47152, 64849, 123537, 152463, 170141, 180458, 187793, 192719,
            196514, 199337, 201628, 203402, 204944, 206130, 207202, 208118,
            208860, 209563, 210162, 210162];

    var point = jim.newMandelbrotPoint.create();
    var input = [
        point.input(-2.5,   -1,     0, 0, 0),
        point.input(-0.68,  -1,     0, 0, 0),
        point.input(-0.195, -1,     0, 0, 0),
        point.input(-0.18,  -1,     0, 0, 0),
        point.input(-0.165, -1,     0, 0, 0),
        point.input(-0.13,  -1,     0, 0, 0),
        point.input(-0.135, -0.99,  0, 0, 0),
        point.input(-0.02,  -1,     0, 0, 0),
        point.input(-0.06,  -0.99,  0, 0, 0),
        point.input(-0.09,  -0.965, 0, 0, 0)
    ];

    var output = [
        point.input(-2.5,   -1,     1.9241158482850517e+21, 9.891957458412253e+21   , 2),
        point.input(-0.68,  -1,     2.6164248809165524e+22, -1.716265552226105e+22  , 5),
        point.input(-0.195, -1,     -140869909502375660,    -160139353589919970     , 9),
        point.input(-0.18,  -1,     271963349311034980,     364150082714855550      , 10),
        point.input(-0.165, -1,     219993685677987260,     -319836547602693900     , 11),
        point.input(-0.13,  -1,     524323756740069300000,  -212145251043638380000  , 15),
        point.input(-0.135, -0.99,  59.13783777794642,      -43.006192874796824     , 19),
        point.input(-0.02,  -1,     0.04696420825574511,    3.176445741904047       , 20),
        point.input(-0.06,  -0.99,  12221335605643570,      4710611536518314        , 0),
        point.input(-0.09,  -0.965, -51688787.61848581,     29227438.9982872        , 0)
    ];

    var xState = new Float64Array(10);
    var yState = new Float64Array(10);
    var escapeValues = new Uint32Array(10);
    var imageEscapeValues = new Uint32Array(10);

    function setState(p,i) {
        xState[i] = p.x;
        yState[i] = p.y;
        escapeValues[i] = p.histogramEscapedAt;
        imageEscapeValues[i] = p.imageEscapedAt;
    }

    input.forEach(function (p,i) {
        setState(p,i);
    });

    var pixelStateTracker = {putPixel: putPixel, getPixel: getPixel};
    function index(i,j){
        return ((j * 2) + i);
    }

    function getPixel(i,j){
        var idx = index(i,j);
        var x = xState[idx];
        var y = yState[idx];
        var he = escapeValues[idx];
        var ye = imageEscapeValues[idx];
        return point.input(0,0,x,y,he,ye);
    }

    function putPixel(p,i,j) {
        var idx = index(i,j);
        setState(p, idx);
    }

    it("should be able to process the set and get and put pixels appropriately", function () {
        var msg = {mx:-2.5, my: -1, mw: 2, mh: 1};
        var processor = jim.worker.msetProcessor.create();
        processor.processSet(msg, pixelStateTracker, 0, 3, 2, 5, []);
        processor.processSet(msg, pixelStateTracker, 3, 3, 2, 5, []);
        var expected = [2,3,2,4,2,4,2,5,2,6];
        expected.forEach(function (val, i) {
            expect(escapeValues[i]).toBe(val);
        });

    });

    it("should be able to calculate various mandelbrot points from 0 to 20", function () {

       input.forEach(function (d, i) {
           var result = point.calcObject(d, 0, 20);
           expect(result.histogramEscapedAt).toBe(output[i].histogramEscapedAt);
       });
    });

    it("should be able to calculate single mandelbrot point from 0 to 5", function () {
        var result = point.calcObject(input[1], 0, 5);
        expect(result.histogramEscapedAt).toBe(5);
    });

    it("should not escape point from 0 to 4", function () {
        var result = point.calcObject(input[1], 0, 4);
        expect(result.histogramEscapedAt).toBe(0);
    });

    // What do I expect when I access histogram? Shouldn't I expect to get the iteration number? ie get(1) returns 1? etc at the moment it's getting put at 0
    it("should update the histogram correctly for single update and total it", function (done) {
        events.clear();
        var histoUpdater = jim.mandelbrot.escapeDistributionHistogram.create(events);

        var update = {update: [0,1,2,3,4], currentIteration: 0};

        on(events.histogramUpdated, function (histoinfo) {
            var histo = histoinfo.array;

            expect(histo[0]).toBe(0);
            expect(histo[1]).toBe(1);
            expect(histo[2]).toBe(3);
            expect(histo[3]).toBe(6);
            expect(histo[4]).toBe(10);
            done();
        });

        events.fire(events.histogramUpdateReceivedFromWorker, update);

    });

    it("should update the histogram correctly for two updates and update totals", function (done) {
        events.clear();
        var histoUpdater = jim.mandelbrot.escapeDistributionHistogram.create(events);
        var called = 0;
        var update = {update: [0,1,2,3,4], currentIteration: 0};
        var update2 = {update: [0,1,2,3,4], currentIteration: 5};

        on(events.histogramUpdated, function (histoinfo) {
            var histo = histoinfo.array;
            called +=1;
            if(called === 2) {
                expect(histo[0]).toBe(0);
                expect(histo[1]).toBe(1);
                expect(histo[2]).toBe(3);
                expect(histo[3]).toBe(6);
                expect(histo[4]).toBe(10);
                expect(histo[5]).toBe(10);
                expect(histo[6]).toBe(11);
                expect(histo[7]).toBe(13);
                expect(histo[8]).toBe(16);
                expect(histo[9]).toBe(20);
                done();
            }

        });

        events.fire(events.histogramUpdateReceivedFromWorker, update);
        events.fire(events.histogramUpdateReceivedFromWorker, update2);

    });

    it("should update the histogram correctly for two updates at th same point in the array", function (done) {
        events.clear();
        var histoUpdater = jim.mandelbrot.escapeDistributionHistogram.create(events);
        var called = 0;
        var update = {update: [0,1,2,3,4], currentIteration: 0};
        var update2 = {update: [0,1,2,3,4], currentIteration: 0};

        on(events.histogramUpdated, function (histoinfo) {
            var histo = histoinfo.array;
            called +=1;
            if(called === 2) {
                expect(histo[0]).toBe(0);
                expect(histo[1]).toBe(2);
                expect(histo[2]).toBe(6);
                expect(histo[3]).toBe(12);
                expect(histo[4]).toBe(20);
                expect(histo[5]).toBe(0);
                expect(histo[6]).toBe(0);
                expect(histo[7]).toBe(0);
                expect(histo[8]).toBe(0);
                expect(histo[9]).toBe(0);
                done();
            }

        });

        events.fire(events.histogramUpdateReceivedFromWorker, update);
        events.fire(events.histogramUpdateReceivedFromWorker, update2);

    });

    it("should be able to calculate various mandelbrot points from 0 to 10 and 10 to 20", function () {
        var point = jim.newMandelbrotPoint.create();

        input.forEach(function (d, i) {
            var intermediateResult = point.calcObject(d, 0, 10);
            var result = point.calcObject(intermediateResult, 10, 10);
            console.log("Checking iteration escaped");
            expect(result.histogramEscapedAt).toBe(output[i].histogramEscapedAt);
        });
    });

    it("should create the same histo as the multiworker generator", function (done) {
       var palette = jim.palette.create();
       var currentExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);
       events.clear();

       var mset = jim.mandelbrot.webworkerInteractive.create (700, 400, events, 20,1);

       on(events.histogramUpdateReceivedFromWorker, function (update) {
           var histoData = total(update.update);
           console.log("histo worker up date received");
           for (var i = 0 ; i < 10 ; i +=1) {
               expect(histoData[i]).toBe(expectedHistogramValuesForTwentyIterations[i]);
           }
           mset.stop();
           mset.destroy();
           done();
       });

       events.fire(events.paletteChanged, palette);
       events.fire(events.extentsUpdate, currentExtents);
    });
     it("should calculate the same histogram whether or not it is 0 to 20 or 0 to 10 and then 10 to 20", function (done) {
         var newJob = jim.messages.interactive.create;
         var renderDefinition =  jim.messages.renderFragment.create;
         var palette = jim.palette.create();
         events.clear();
         var noughtToTwentyHistogram = new Uint32Array(20);
         var noughtToTenHistogram = new Uint32Array(20);

         function combine(arr1, arr2, from) {
             for (var i = 0 ; i < arr1.length; i +=1) {
                 arr2[from + i] += arr1[i];
             }
         }
         var job = 0;
         function updateHistogram(_msg, currentIteration, arr2) {
             var update = new Uint32Array(_msg.histogramUpdate);
             console.log("called with current Iteration " + currentIteration);
             if (currentIteration ===10 ){
                 console.log("Contents of update for final job");
                 for (var i = 0 ; i < 10 ; i +=1) {
                     console.log("update[ " + update[i] + " ]");
                 }
             }
             combine(update, arr2, currentIteration);
         }

         var pool = jim.worker.pool.create(1, "/js/combinedWorker.js", [], "none", "histogramDataBuffer");
         var mainRender = renderDefinition(0, -2.5, -1, 3.5, 2, 700, 400);
         var secondaryRender = renderDefinition(0, 0, 0, 0, 0, 700, 400);
         var noughtToTwentyJob =  newJob(mainRender.asMessage(), noughtToTwentyHistogram, 0, 20, palette.toNodeList(), 0);
         var noughtToTenJob =  newJob(mainRender.asMessage(), noughtToTenHistogram, 0, 10, palette.toNodeList(), 0);
         var tenToTwentyJob =  newJob(secondaryRender.asMessage(), noughtToTenHistogram, 10, 20, palette.toNodeList(), 0);

         pool.consume([noughtToTwentyJob], function (_msg) {updateHistogram(_msg, 0, noughtToTwentyHistogram);}, function () {
             //pool.terminate();
             var currentIteration = 0;
             pool.consume([noughtToTenJob, tenToTwentyJob], function (_msg) {
                 updateHistogram(_msg, currentIteration, noughtToTenHistogram);
                 currentIteration +=10;
             }, function () {
                 for(var i = 0 ; i< 20 ; i+=1) {
                     expect(noughtToTenHistogram[i]).toBe(noughtToTwentyHistogram[i]);
                 }
                 pool.terminate();

                 done();
             });
         });



     });
    function doAThing(i) {
        return function (done) {
            console.log(i);
            done();
        };
    }

    function promise() {

        var chain = [];
        function done() {
            var f = chain.shift();
            if(f) f(done);
        }
        return {
            then: function (f2) {
                chain.push(f2);
                return this;
            },
            resolve: done
        };
    }

    it("should make callback hell less of an issue", function () {
       promise()
           .then(doAThing(1))
           .then(doAThing(2))
           .then(doAThing(3))
           .resolve();
    });

});