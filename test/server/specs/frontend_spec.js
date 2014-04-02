var fun = require("homePage").create(),
    testEnvironment = require("testEnvironment.js").create({portNo: 8124, requestHandler: fun.requestHandler }),
    driver = testEnvironment.driver;

describe("The main page", function () {
    "use strict";
    it("should have the title Hello", function (done) {
        driver.get('http://127.0.0.1:8124/');
        driver.getTitle().then(function (title) {
            expect(title).toBe('Hello');
            done();
        });
    });
});
