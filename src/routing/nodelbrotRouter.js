var router = require("routing/router.js");
exports.create = function () {
    "use strict";
    var nodelbrotRouter = router.create(),
        clientJasmineTests = require("pages/jasmineClientTests.js"),
        indexPageAction = require("pages/homePage.js");

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction.contents);
    nodelbrotRouter.addRoute("/jasmine", clientJasmineTests.contents);
    return nodelbrotRouter;
};