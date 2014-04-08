

exports.requestHandler = function (request, response) {
    "use strict";
    var handlebars = require("handlebars"),
        fs = require("files.js").create(),
        templateName = "src/templates/html.hbl";
    fs.withFiles([templateName], function (err, files) {
        var template = files[templateName],
            renderedHtml =  handlebars.compile(template)({head: "head", body: "<div id=jasmineTests>Jasmine tests</div>"});
        response.write(renderedHtml);
        response.end();
    });
}
