exports.create = function () {
    "use strict";
    var html = require("templates/index.js").create(),
        handlebars = require("handlebars"),
        page = handlebars.compile(html);
    return page({body: "<div id=jasmineTests>Jasmine tests</div>"});
}
