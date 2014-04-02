exports.create = function () {
    "use strict";
    var bodyString = require("templates/body.js").create(),
        indexString = require("templates/index.js").create(),
        handlebars = require("handlebars"),
        requestHandler = function (request, response) {
            var bodyTemplate = handlebars.compile(bodyString),
                indexTemplate = handlebars.compile(indexString),
                body = bodyTemplate({ name: "helenywelenywoo"}),
                page = indexTemplate({ body: body});
            response.write(page);
            response.end();
        };
    return {
        requestHandler: requestHandler
    };
};