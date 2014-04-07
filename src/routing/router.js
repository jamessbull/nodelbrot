exports.create = function () {
    "use strict";
    var routes = require("routing/routes.js").create(),
        route = require("routing/route.js"),
        router = function (request, response) {
            var requestRoute = routes.routeFor(request.url);
            if (requestRoute) {
                requestRoute.execute(request, response);
            } else {
                response.statusCode = 404;
            }
        };
    router.addRoute = function (url, action) { routes.add(route.create(url, action)); };
    router.routes = function () { return routes.asList; };
    return router;
};
