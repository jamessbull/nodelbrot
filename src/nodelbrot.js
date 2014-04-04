var server = require("webserver.js"),
    http = require("http"),
    router = require("routing/nodelbrotRouter.js");

exports.create = function (args) {
    "use strict";
    var defaults = {
        portNo: 8090,
        http: require("http"),
        router: router.create()
    },
        serverArgs;
    if (arguments.length) {
        serverArgs = args;
    } else {
        serverArgs = defaults;
    }

    return {
        start: function () {
            var webserver = server.create(serverArgs);
            webserver.start();
        },
        router: serverArgs.router
    };
};

