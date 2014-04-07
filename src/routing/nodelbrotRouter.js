var router = require("routing/router.js"),
    index = require("homePage.js");
exports.create = function () {
    "use strict";
    var nodelbrotRouter = router.create(),
        clientJasmineTests = require("client/jasmine/tests.js"),
        indexPageAction = index.create();

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction.requestHandler);
    nodelbrotRouter.addRoute("/jasmine", function (request, response) {
        var testPage = clientJasmineTests.create();
        response.write(testPage);
        response.end();
    });
    return nodelbrotRouter;
};