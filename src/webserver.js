var fs = require("fs"),
    handlebars = require('handlebars'),server,
    render = function (templateName, context) {
        "use strict";
        var input = fs.readFileSync("src/templates/" + templateName + ".hbs", "utf8");
        return handlebars.compile(input)(context);
    };

var mandelbrotPage = function (request, response) {
    "use strict";
    var body = render("body", { name: "helenywelenywoo"}),
        page = render("index", { body: body});

    response.write(page);
    response.end();
};

exports.create = function (http, portNo) {
    "use strict";
    server = http.createServer(mandelbrotPage);
    return {
        start: function () {
            server.listen(portNo);
            console.log('Server running at http://127.0.0.1:8124/');
        },
        stop: function () {
            server.close(function () { console.log("Server shutdown"); });
        }
    };
};
