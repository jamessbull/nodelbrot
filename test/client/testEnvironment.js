(function () {
    "use strict";
    var webdriver = require('selenium-webdriver'), driver, expect,
        server = require("webserver.js");

    exports.by = webdriver.By;

    exports.start = function () {
        driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
        server.start();
        driver.get('http://127.0.0.1:8124/');
    };

    exports.run = function (fArray) {
        fArray.forEach(function (f) { f(driver); });
    };

    exports.expect = function (expectations) {
        expect = expectations;
    };
    exports.stop = function () {
        driver.quit().then(function () {
            expect();
            server.stop();
        });
    };
}());

