describe("The client test page", function () {
    "use strict";
    it("should have all files in the spec directory in script tags in the head", function (done) {
        var clientPage = require("pages/jasmineClientTests.js");
        clientPage.contents(function (contents) {
            expect(contents).toMatch('<script src="/specs/mandelbrot_spec.js"></script>');
            expect(contents).toMatch('<script src="/specs/testMath_spec.js"></script>');
            done();
        });
    });
    it("should have all files in the client js directory in script tags in the head", function (done) {
        var clientPage = require("pages/jasmineClientTests.js");
        clientPage.contents(function (contents) {
            expect(contents).toMatch('<script src="/js/mandelbrot.js"></script>');
            done();
        });
    });
});
