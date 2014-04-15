exports.contents = function (callback) {
    "use strict";
    var template = require("view/template.js").create,
        page = template("html", {
            head: template("homePage/head", {}),
            body: template("homePage/body", {name: "Jim"})
        });

    page.renderTo(function (contents) {
        callback(contents);
    });
};