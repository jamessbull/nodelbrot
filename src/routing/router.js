exports.create = function () {
    "use strict";
    var routes = require("routing/routes.js").create(),
        route = require("routing/route.js"),
        router = function (request, response) {
            var requestRoute = routes.routeFor(request.url);
            requestRoute.execute(request, response);
        };
    router.addRoute = function (url, action) { routes.add(route.create(url, action)); };
    router.routes = function () { return routes.asList; };
    return router;
};
