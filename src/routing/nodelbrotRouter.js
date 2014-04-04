var router = require("routing/router.js"),
    index = require("homePage.js");
exports.create = function () {
    "use strict";
    var nodelbrotRouter = router.create(),
        indexPageAction = index.create();

    nodelbrotRouter.routerName = "nodelbrot";
    nodelbrotRouter.addRoute("/", indexPageAction.requestHandler);
    return nodelbrotRouter;
};