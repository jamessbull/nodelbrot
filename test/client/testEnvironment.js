(function () {
    "use strict";
    var webdriver = require('selenium-webdriver'), driver;

    exports.by = webdriver.By;

    exports.start = function () {
        require("webserver.js");
        driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
        driver.get('http://127.0.0.1:8124/');
    };

    exports.run = function (fArray) {
        fArray.forEach(function (f) { f(driver); });
    };

    exports.stop = function () {
        driver.quit().then(function () {
            process.exit();
        });
    };
}());

