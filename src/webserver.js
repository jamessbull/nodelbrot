var server;

exports.create = function (args) {
    "use strict";
    var http = args.http,
        portNo = args.portNo,
        router = args.router;

    server = http.createServer(router);
    return {
        start: function () {
            server.listen(portNo);
            console.log('Server running at http://127.0.0.1:' + portNo + '/');
        },
        serverFunction: router,
        stop: function () {
            server.close(function () { console.log("Server shutdown"); });
        }
    };
};
