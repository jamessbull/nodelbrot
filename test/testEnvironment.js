(function () {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("webserver.js"),
        driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build(),
        stop = function () {
            driver.quit().then(function () { server.stop(); });
        },
        finishCallback = jasmine.Runner.prototype.finishCallback;

    jasmine.Runner.prototype.finishCallback = function () {
        // Run the old finishCallback
        finishCallback.bind(this)();
        stop();
    };
    exports.driver = driver;
    server.start();
}());

