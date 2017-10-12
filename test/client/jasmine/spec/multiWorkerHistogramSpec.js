describe("the multiworker histogram", function () {
    "use strict";
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    it("should be the same as the combined worker histogram", function (done) {
        var calculation = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var calculation2 = jim.mandelbrot.export.escapeHistogramCalculator.create();
        var source = jim.rectangle.create(-2.5, -1, 3.5, 2);
        var dest = jim.rectangle.create(0,0,700, 400);

        function compareWithMultiWorkerHistogram (previousData) {
            calculation2.calculate(source, dest, 1000, 2, 2, function (_data, _total) {
                for(var i = 0 ; i < 100 ; i +=1) {
                    expect(_data[i]).toBe(previousData[i]);
                }
                done();
            });
        }

        calculation.calculate(source, dest, 1000, 1, 1, function (_data, _total) {
            compareWithMultiWorkerHistogram(_data);
        });

    });
});

describe("The combined worker", function () {
    "use strict";

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
        point.input(-2.5,   -1,     1.9241158482850517e+21, 9.891957458412253e+21   , 3),
        point.input(-0.68,  -1,     2.6164248809165524e+22, -1.716265552226105e+22  , 5),
        point.input(-0.195, -1,     -140869909502375660,    -160139353589919970     , 10),
        point.input(-0.18,  -1,     271963349311034980,     364150082714855550      , 11),
        point.input(-0.165, -1,     219993685677987260,     -319836547602693900     , 12),
        point.input(-0.13,  -1,     524323756740069300000,  -212145251043638380000  , 16),
        point.input(-0.135, -0.99,  59.13783777794642,      -43.006192874796824     , 20),
        point.input(-0.02,  -1,     0.04696420825574511,    3.176445741904047       , 0),
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

    it("should be able to calculate various mandelbrot points from 0 to 10 and 10 to 20", function () {
        var point = jim.newMandelbrotPoint.create();

        input.forEach(function (d, i) {
            var intermediateResult = point.calcObject(d, 0, 10);
            var result = point.calcObject(intermediateResult, 10, 10);
            console.log("Checking iteration escaped");
            expect(result.histogramEscapedAt).toBe(output[i].histogramEscapedAt);
        });
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
});