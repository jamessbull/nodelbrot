describe("The template contents which are loaded synchronously at application startup", function () {
    "use strict";
    it("should contain the contents of all the files in the templates directory", function () {
        var templateContents = require("view/templateContents.js"),
            contents = templateContents.init("test/integration/filesTest");
        expect(contents.bees({})).toBe("bees");
        expect(contents.cheese({})).toBe("cheese");
    });
});
