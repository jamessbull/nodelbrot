exports.create = function () {
    "use strict";
    var routes = [];
    return {
        add: function (route) {
            routes.push(route);
        },
        routeFor: function (url) {
            var matchingRoutes = routes.filter(function (route) { return route.url === url; });
            return matchingRoutes[0];
        },
        asList: routes
    };
};
