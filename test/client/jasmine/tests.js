

exports.renderTo = function (response) {
    "use strict";
    var html = require("templates/index.js").create(),
        handlebars = require("handlebars"),
        page = handlebars.compile(html),
        file = require("fs"),
        compileAndRender = function (context) {
            return function (template) {
                handlebars.compile(template)(context);
            };
        };
    file.readFile("specRunner.hbl", compileAndRender({test: "foo"}));
    return page({body: "<div id=jasmineTests>Jasmine tests</div>"});
}
