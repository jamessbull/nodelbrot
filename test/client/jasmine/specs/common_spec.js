describe("The namespace function", function () {
    "use strict";

    it("should create objects to represent a namespace. It should not overwrite existing objects", function () {
        namespace("foo.bar.baz");
        expect(foo.bar.baz).toBeDefined();
        foo.bar.welly = "pumpkin";
        namespace("foo.bar.baz");
        expect(foo.bar.welly).toBe("pumpkin");
    });

    it("should create sub objects even if a higher level object is defined", function () {
        namespace("job.jobby");
        namespace("job.jobby.jobjob");
        expect(job.jobby.jobjob).toBeDefined();
    });
});