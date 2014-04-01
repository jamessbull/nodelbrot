var testEnvironment = require("testEnvironment.js"),
    driver = testEnvironment.driver;

describe("A thing", function () {
    "use strict";
    it("should test the title", function (done) {
        driver.get('http://127.0.0.1:8124/');
        driver.getTitle().then(function (title) {
            expect(title).toBe('Hello');
            done();
        });
    });
});