exports.create = function () {
    "use strict";
    var template = require("view/template.js").create,
        page = template("html", {
            head: template("homePage/head", {}),
            body: template("homePage/body", {name: "Jim"})
        });

    return function (request, response) {
        page.renderTo(function (contents) {
            response.write(contents);
            response.end();
        });
    };
};