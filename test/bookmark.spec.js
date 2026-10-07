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

    it("should read a link saved with the top left of the area", function () {
        expect(parse(link(valid))).toEqual({area: {x: -0.75, y: 0, w: 3.5, h: 2}, nodes: valid.nodes, blend: "hsv"});
    });

    it("should read a link saved with the centre of the area as decimals", function () {
        const deep = {view: {x: "-0.743643887037158704752191506114774", y: "0.1318259042053119704931", w: 1e-30, h: 5e-31},
            nodes: valid.nodes, blend: "rgb"};
        expect(parse(link(deep))).toEqual({area: deep.view, nodes: valid.nodes, blend: "rgb"});
    });

    it("should not read a link whose centre isn't a number", function () {
        const bad = {view: {x: "-0.74abc", y: "0", w: 1, h: 1}, nodes: valid.nodes};
        expect(parse(link(bad))).toBeNull();
        expect(parse(link({view: {x: "1", y: "0", w: -1, h: 1}, nodes: valid.nodes}))).toBeNull();
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
