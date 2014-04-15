var router = require("routing/router.js"),
    fs = require("fs");
exports.create = function () {
    "use strict";
    var nodelbrotRouter = router.create(),
        clientJasmineTests = require("pages/jasmineClientTests.js"),
        indexPageAction = require("pages/homePage.js"),
        addDirectory = function (router, url, path) {
            var files = fs.readdirSync(path);
            files.forEach(function (file) {
                var readFile = function (callback) {
                    var handleCallBack = function (err, data) { callback(data); };
                    fs.readFile(path + file, handleCallBack);
                };
                router.addRoute(url + "/" + file, readFile);
            });
        };

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction.contents);
    nodelbrotRouter.addRoute("/jasmine", clientJasmineTests.contents);
    addDirectory(nodelbrotRouter, "/js", "src/client/");
    addDirectory(nodelbrotRouter, "/specs", "test/client/jasmine/specs/");
    return nodelbrotRouter;
};