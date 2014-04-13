var router = require("routing/router.js");
exports.create = function () {
    "use strict";
    var nodelbrotRouter = router.create(),
        clientJasmineTests = require("pages/jasmineClientTests.js").create(),
        indexPageAction = require("pages/homePage.js").create();

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction);
    nodelbrotRouter.addRoute("/jasmine", clientJasmineTests);
    return nodelbrotRouter;
};