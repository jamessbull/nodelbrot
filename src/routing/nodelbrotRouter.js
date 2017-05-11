var router = require("routing/router.js"),
    fs = require("fs");
exports.create = function () {
    "use strict";

    var has = function (str1, str2) {
        return str1.indexOf(str2) !== -1;
    };

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
                if (has(file, ".js") || has(file, ".css") || has(file, ".png")) {
                    router.addRoute(url + "/" + file, readFile);
                }
            });
        };

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction.contents);
    nodelbrotRouter.addRoute("/jasmine", clientJasmineTests.contents);
    addDirectory(nodelbrotRouter, "/js", "src/client/");
    addDirectory(nodelbrotRouter, "/js/export", "src/client/export/");
    addDirectory(nodelbrotRouter, "/js/messages", "src/client/messages/");
    addDirectory(nodelbrotRouter, "/js/ui", "src/client/ui/");
    addDirectory(nodelbrotRouter, "/js/actions", "src/client/ui/actions/");
    addDirectory(nodelbrotRouter, "/specs", "test/client/jasmine/spec/");
    addDirectory(nodelbrotRouter, "/lib/jasmine-2.4.1", "test/client/jasmine/lib/jasmine-2.4.1/");
    return nodelbrotRouter;
};