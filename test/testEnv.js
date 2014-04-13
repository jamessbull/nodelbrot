var running = false;
exports.create = function (args) {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("nodelbrot.js"),
        routing = require("routing/nodelbrotRouter.js"),
        http = args.http,
        driver = args.driver,
        portNo = args.portNo,
        router = routing.create(),
        webserver,
        finishCallback = jasmine.Runner.prototype.finishCallback;

    jasmine.Runner.prototype.finishCallback = function () {
        finishCallback.bind(this)();
        driver.quit().then(function () { webserver.stop(); });
    };

    if (!running) {
        webserver = server.create({http: http, portNo: portNo, router: router});
        webserver.start();
        running = true;
    }

    return { driver: driver, server: webserver };
};

