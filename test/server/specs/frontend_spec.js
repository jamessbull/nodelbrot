var testSuite = require("testSuite.js");

describe("A thing", function () {
    "use strict";
    it("should run the tests on the client", function (done) {
        testSuite.run(function () {
            expect(1 + 1).toBe(2);
            done();
        });
    });
});