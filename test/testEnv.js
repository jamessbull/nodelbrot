var running = false;
exports.create = function (args) {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("webserver.js"),
        http = args.http,
        driver = args.driver,
        portNo = args.portNo,
        requestHandler = args.requestHandler,
        webserver,
        finishCallback = jasmine.Runner.prototype.finishCallback;

    jasmine.Runner.prototype.finishCallback = function () {
        finishCallback.bind(this)();
        driver.quit().then(function () { server.stop(); });
    };

    if (!running) {
        webserver = server.create(http, portNo, requestHandler);
        webserver.start();
        running = true;
    }

    return { driver: driver, server: webserver };
};

