exports.create = function (args) {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("webserver.js"),
        http = require('http'),
        driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build(),
        webserver,
        stop = function () {
            driver.quit().then(function () { server.stop(); });
        },
        finishCallback = jasmine.Runner.prototype.finishCallback;

    jasmine.Runner.prototype.finishCallback = function () {
        // Run the old finishCallback
        finishCallback.bind(this)();
        stop();
    };
    webserver = server.create(http, args.portNo, args.requestHandler);
    webserver.start();
    return { driver: driver};
};

