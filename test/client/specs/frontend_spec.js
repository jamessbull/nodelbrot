var http = require("http"),
    jasminePage = require("client/pageModel/jasminePage.js"),
    webdriver = require("selenium-webdriver"),
    driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();

require("testEnv.js").create({
    portNo: 8124,
    http: http,
    driver: driver
});

describe("The main page", function () {
    "use strict";
    it("should have the title Hello", function (done) {
        driver.get('http://127.0.0.1:8124/');
        driver.getTitle().then(function (title) {
            expect(title).toBe('Hello');
            done();
        });
    });
    it("should pass the client side jasmine tests", function (done) {
        var page = jasminePage.create(driver, webdriver.By, "http://127.0.0.1:8124");
        page.open();
        page.jasmineTestsDiv(function (element) {
            expect(element.getText()).toBe("Jasmine tests");
            done();
        });
    });
});
