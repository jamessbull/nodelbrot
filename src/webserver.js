var server;

exports.create = function (http, portNo, servingFunction) {
    "use strict";
    server = http.createServer(servingFunction);
    return {
        start: function () {
            server.listen(portNo);
            console.log('Server running at http://127.0.0.1:' + portNo + '/');
        },
        stop: function () {
            server.close(function () { console.log("Server shutdown"); });
        }
    };
};
