
describe("The template context for", function () {
    "use strict";
    it("should render a full template to the response", function (done) {
        var response = require("server/stubs/response.js").create(),
            template = require("view/template.js").create,
            page;
        page = template("html", {
            head: "",
            body: template("homePage/body", {
                name: "Jim"
            })
        });
        page.renderTo(response, null, function () {
            expect(response.written()).toMatch('Hello Jim');
            expect(response.written()).toMatch('html');
            expect(response.written()).toMatch('head');
            expect(response.written()).toMatch('body');
            expect(response.written()).toMatch('<!DOCTYPE HTML PUBLIC ' +
                '"-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">');
            done();
        });
    });
});
