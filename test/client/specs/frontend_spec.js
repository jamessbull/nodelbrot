var fun = require("homePage").create(),
    http = require("http"),
    webdriver = require("selenium-webdriver"),
    driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build(),
    testEnvironment = require("testEnv.js").create({
        portNo: 8124,
        requestHandler: fun.requestHandler,
        http: http,
        driver: driver
    }),
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
