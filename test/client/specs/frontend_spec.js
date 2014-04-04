var http = require("http"),
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
});
