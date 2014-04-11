exports.create = function (templateContents) {
    "use strict";
    var template = require("view/template.js").create,
        page;


    page = template("html", {
        head: "",
        body: template("homePage/body", {name: "Jim"})
    });


    return function (request, response) {
        var name = "index";
        page.renderTo(response);
        response.end();
    };
};