var running = false;
exports.create = function (args) {
    "use strict";
    var webdriver = require('selenium-webdriver'),
        server = require("nodelbrot.js"),
        routing = require("routing/nodelbrotRouter.js"),
        clientJasmineTests = require("client/jasmine/tests.js"),
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

    router.addRoute("/jasmine", function (request, response) {
        var testPage = clientJasmineTests.create();
        response.write(testPage);
        response.end();
    });

    if (!running) {
        webserver = server.create({http: http, portNo: portNo, router: router});
        webserver.start();
        running = true;
    }

    return { driver: driver, server: webserver };
};

