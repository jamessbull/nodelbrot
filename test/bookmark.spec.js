import { parseBookmark } from "../src/client/bookmarks.js";

describe("reading bookmark links", function () {
    const parse = parseBookmark;
    const valid = {location: {x: -2.5, y: -1, w: 3.5, h: 2}, nodes: [{position: 0.8, colourDesc: {h: 46, s: "88.9%", v: 0.95}}], blend: "hsv"};

    function link(info) {
        return encodeURI(JSON.stringify(info));
    }

    function withChanges(changes) {
        return JSON.parse(JSON.stringify(Object.assign({}, valid, changes)));
    }

    it("should read a valid link", function () {
        expect(parse(link(valid))).toEqual(valid);
    });

    it("should read a link saved before the blend was added", function () {
        const old = withChanges({});
        delete old.blend;
        expect(parse(link(old)).blend).toBeUndefined();
    });

    it("should not read a link that has been cut short", function () {
        const text = link(valid);
        expect(parse(text.slice(0, text.length - 5))).toBeNull();
        expect(parse(text.slice(0, 20))).toBeNull();
    });

    it("should not read a link that isn't validly encoded", function () {
        expect(parse("%E0%A4%A")).toBeNull();
    });

    it("should not read a link without a usable location", function () {
        expect(parse(link(withChanges({location: undefined})))).toBeNull();
        expect(parse(link(withChanges({location: {x: -2.5, y: -1, w: 0, h: 2}})))).toBeNull();
        expect(parse(link(withChanges({location: {x: "a", y: -1, w: 3.5, h: 2}})))).toBeNull();
    });

    it("should not read a link with unusable palette nodes", function () {
        expect(parse(link(withChanges({nodes: "none"})))).toBeNull();
        expect(parse(link(withChanges({nodes: [{position: 2, colourDesc: {h: 1, s: 1, v: 1}}]})))).toBeNull();
        expect(parse(link(withChanges({nodes: [{position: 0.5, colourDesc: {h: 1, s: "lots", v: 1}}]})))).toBeNull();
        expect(parse(link(withChanges({nodes: [null]})))).toBeNull();
    });

    it("should read a link with no palette nodes", function () {
        expect(parse(link(withChanges({nodes: []}))).nodes).toEqual([]);
    });
});
