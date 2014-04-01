var http = require('http'),
    fs = require("fs"),
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


exports.start = function () {
    "use strict";
    server = http.createServer(mandelbrotPage).listen(8124);
    console.log('Server running at http://127.0.0.1:8124/');
};

exports.stop  = function () {
    "use strict";
    server.close(function () { console.log("Server shutdown"); });
};
