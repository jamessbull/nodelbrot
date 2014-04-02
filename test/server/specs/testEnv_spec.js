var noOfTimesCalled = 0,
    requestHandler = function () {
        noOfTimesCalled += 1;
    },
    testEnvironment = require("testEnv.js"),
    http = require("server/stubs/http.js");

describe("testEnvironment for webdriver tests", function () {
    "use strict";
    it("should not create a second server if one is already running", function () {
        expect(http.createCalled()).toBe(0);
        testEnvironment.create({portNo: 8124, requestHandler: requestHandler, http: http});
        expect(http.createCalled()).toBe(1);
        testEnvironment.create({portNo: 8124, requestHandler: requestHandler, http: http});
        expect(http.createCalled()).toBe(1);
    });
});
