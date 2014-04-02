exports.create = function (args) {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("webserver.js"),
        http = args.http,
        driver = args.driver,
        portNo = args.portNo,
        requestHandler = args.requestHandler,
        //driver = new webdriver.Builder().build(),
        webserver,
        stop = function () {
            driver.quit().then(function () { server.stop(); });
        },
        finishCallback = jasmine.Runner.prototype.finishCallback;

    jasmine.Runner.prototype.finishCallback = function () {
        finishCallback.bind(this)();
        stop();
    };
    webserver = server.create(http, portNo, requestHandler);
    webserver.start();
    return { driver: driver, server: webserver };
};

