import { createProgressReporter } from "../src/client/export/progress.js";

describe("export progress", function () {
    it("should report the share of pixels done", function () {
        const target = {innerText: ""};
        const reporter = createProgressReporter(target);
        reporter.reportOn(10, 10);
        expect(target.innerText).toEqual("0%");
        reporter.add(10);
        expect(target.innerText).toEqual("10%");
        reporter.add(50);
        expect(target.innerText).toEqual("60%");
        reporter.add(40);
        expect(target.innerText).toEqual("100%");
    });

    it("should start again after reaching 100%", function () {
        const target = {innerText: ""};
        const reporter = createProgressReporter(target);
        reporter.reportOn(10, 10);
        reporter.add(100);
        reporter.add(40);
        expect(target.innerText).toEqual("40%");
    });
});
