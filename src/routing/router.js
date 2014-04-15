exports.create = function () {
    "use strict";
    var routes = require("routing/routes.js").create(),
        route = require("routing/route.js"),
        router = function (request, response) {
            var requestRoute = routes.routeFor(request.url);
            if (requestRoute) {
                requestRoute.execute(function (contents) {
                    response.write(contents);
                    response.end();
                });
            } else {
                response.statusCode = 404;
                response.end();
            }
        };
    router.addRoute = function (url, action) { routes.add(route.create(url, action)); };
    router.routes = function () { return routes.asList; };
    router.routeFor = function (url) { return routes.routeFor(url); };
    return router;
};
