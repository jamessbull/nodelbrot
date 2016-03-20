exports.create = function () {
    "use strict";
    var routes = [];
    return {
        add: function (route) {
            routes.push(route);
        },
        routeFor: function (url) {
            var matchingRoutes = routes.filter(function (route) {
                var split = url.split("?");
                return route.url === split[0];
            });
            return matchingRoutes[0];
        },
        asList: routes
    };
};
