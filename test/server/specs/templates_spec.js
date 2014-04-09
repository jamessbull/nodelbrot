
describe("The template context for", function () {
    "use strict";
    var template = require("html/template.js"),
        hbl = require("handlebars"),
        templates = {
            headTemplate: hbl.compile("testHead"),
            bodyTemplate: hbl.compile("testBody"),
            index: hbl.compile("head: {{{head}}}, body: {{{body}}}")
        },
        head = template.base("headTemplate"),
        body = template.base("bodyTemplate");


    it(" the html page should have head and body", function () {
        var main = template.html("index", head, body),
            page = main.render(templates);

        expect(page).toMatch("head: testHead, body: testBody");
    });
    it("the jasmine client test page should have the correct name", function () {
        var jas = require("pages/jasmineClientTests.js"),
            page = jas.create();
        expect(page.name).toBe("jasmineClientTests");
    });
});
