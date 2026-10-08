import { createRendererChoice } from "../src/client/rendererChoice.js";
import { gaugeLayout, shortDepth } from "../src/client/depthGauge.js";

// A <select> with Auto and CPU, as the toolbar has.
function fakeSelect() {
    const listeners = [];
    return {
        value: "auto",
        title: "",
        options: [{value: "auto", textContent: "Auto"}, {value: "cpu", textContent: "CPU"}],
        addEventListener: (type, listener) => listeners.push(listener),
        choose: function (value) {
            this.value = value;
            listeners.forEach((listener) => listener());
        }
    };
}

function fakeStorage(initial = {}) {
    const items = Object.assign({}, initial);
    return {getItem: (key) => (key in items ? items[key] : null), setItem: (key, value) => { items[key] = String(value); }, items};
}

const shallow = {pixelSize: 1e-6};
const deep = {pixelSize: 1e-40};

describe("the renderer choice", function () {
    it("should have the GPU draw every view, by default, however deep", function () {
        const choice = createRendererChoice({select: fakeSelect(), gpuAvailable: true});
        expect(choice.rendererFor(shallow)).toBe("gpu");
        expect(choice.rendererFor(deep)).toBe("gpu");
    });

    it("should have the CPU draw everything where there's no GPU, or it's chosen", function () {
        expect(createRendererChoice({select: fakeSelect(), gpuAvailable: false}).rendererFor(shallow)).toBe("cpu");
        const select = fakeSelect();
        const storage = fakeStorage();
        const choice = createRendererChoice({select, gpuAvailable: true, storage});
        const heard = [];
        choice.onChange((chosen) => heard.push(chosen));
        select.choose("cpu");
        expect(choice.rendererFor(shallow)).toBe("cpu");
        expect(heard).toEqual(["cpu"]);
        // And remember it for next time.
        expect(storage.items["nodelbrot.renderer"]).toBe("cpu");
        const next = createRendererChoice({select: fakeSelect(), gpuAvailable: true, storage});
        expect(next.rendererFor(shallow)).toBe("cpu");
    });

    it("should go by the address over what was chosen before", function () {
        const storage = fakeStorage({"nodelbrot.renderer": "cpu"});
        expect(createRendererChoice({select: fakeSelect(), gpuAvailable: true, storage, requested: "gpu"}).rendererFor(shallow)).toBe("gpu");
        expect(createRendererChoice({select: fakeSelect(), gpuAvailable: true, requested: "cpu"}).rendererFor(shallow)).toBe("cpu");
    });

    it("should manage without storage that refuses", function () {
        const storage = {getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }};
        const select = fakeSelect();
        const choice = createRendererChoice({select, gpuAvailable: true, storage});
        select.choose("cpu");
        expect(choice.rendererFor(shallow)).toBe("cpu");
    });

    it("should leave a GPU that stopped working until the view moves, and for good the third time", function () {
        const choice = createRendererChoice({select: fakeSelect(), gpuAvailable: true});
        for (let time = 1; time <= 2; time += 1) {
            choice.lost();
            expect(choice.rendererFor(shallow)).withContext("lost " + time).toBe("cpu");
            choice.moved();
            expect(choice.rendererFor(shallow)).withContext("moved after " + time).toBe("gpu");
        }
        choice.lost();
        choice.moved();
        expect(choice.rendererFor(shallow)).toBe("cpu");
    });

    it("should say what Auto is using, and why", function () {
        const select = fakeSelect();
        const choice = createRendererChoice({select, gpuAvailable: true});
        choice.showInUse("gpu", shallow);
        expect(select.options[0].textContent).toBe("Auto (GPU)");
        choice.lost();
        choice.showInUse("cpu", deep);
        expect(select.options[0].textContent).toBe("Auto (CPU)");
        expect(select.title).toContain("stopped working");
    });
});

describe("the depth gauge", function () {
    it("should put depths down the line on a log scale, with room past the deeper", function () {
        const layout = gaugeLayout(100, 10000);
        expect(layout.current).toBeCloseTo(Math.log(101) / Math.log(13001), 10);
        expect(layout.target).toBeLessThan(1);
        expect(layout.target).toBeGreaterThan(0.9);
        // Past the target, the target moves up.
        const past = gaugeLayout(100000, 10000);
        expect(past.target).toBeLessThan(past.current);
        expect(gaugeLayout(0, 0).current).toBe(0);
    });

    it("should write depths short", function () {
        expect([950, 12500, 340400, 999999, 2100000].map(shortDepth)).toEqual(["950", "12.5k", "340k", "1.0M", "2.1M"]);
    });
});
