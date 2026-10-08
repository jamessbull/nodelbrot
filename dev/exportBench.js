// Times exports of a view by each route, from the browser console on the explorer's page (dev server):
//
//     const b = await import("/dev/exportBench.js");
//     await b.run("gpu", {link: "...", width: 475, height: 203, depth: 1000000});
//
// Routes: "direct" (doubles, on the CPU), "nucleus" and "centre" (perturbation on the CPU, from a nucleus
// the search finds or the view's centre), "gpu" (on the GPU, pixels in the main cardioid and bulb marked
// first) and "gpu-plain" (without that). link is the text after # in a link to the view. Resolves with
// {seconds, image, orbit}, timing the export itself, not working out the reference orbit.
import * as api from "/client/main.js";

const newWorker = () => new Worker("/client/main.js", {type: "module"});

export function run(route, {link, width, height, depth, displayWidth = 1898}) {
    const info = JSON.parse(decodeURIComponent(link));
    const view = info.view;
    const palette = api.createPalette();
    palette.fromNodeList(info.nodes);
    palette.setBlend(info.blend);
    const w = view.w, h = view.h, cx = parseFloat(view.x), cy = parseFloat(view.y);
    return new Promise(function (resolve, reject) {
        let started;
        const done = (extra) => (image) => resolve(Object.assign({seconds: (performance.now() - started) / 1000, image}, extra));
        if (route === "direct") {
            started = performance.now();
            api.renderExport({extents: api.rectangle(cx - w / 2, cy - h / 2, w, h), width, height, depth, palette, newWorker,
                onComplete: done({}), onError: reject});
            return;
        }
        const events = api.createEvents();
        const referenceOrbit = api.createReferenceOrbit({events, newWorker, needed: () => true, searchRadius: route === "centre" ? 0 : 1000});
        const px = w / displayWidth;
        events.fire(events.viewChanged, api.viewAt(view.x, view.y, px));
        // Time for the nucleus search, as the explorer would have had.
        setTimeout(() => referenceOrbit.whenLength(depth + 2).then(function (orbit) {
            const about = {orbit: (orbit.complete ? "complete, " : "") + (orbit.values.length / 2) + " values"};
            const extents = api.rectangle(-w / 2 - orbit.offset.x * px, -h / 2 - orbit.offset.y * px, w, h);
            const finish = (image) => {
                referenceOrbit.dispose();
                done(about)(image);
            };
            started = performance.now();
            if (route.startsWith("gpu")) {
                const point = route === "gpu" ? {x: cx + orbit.offset.x * px, y: cy + orbit.offset.y * px} : null;
                api.renderExportOnGpu({extents, orbit: {values: orbit.values, complete: orbit.complete}, point, palette, depth, width, height,
                    onComplete: finish, onError: reject});
            } else {
                api.renderExport({extents, orbit: {generation: orbit.generation, values: orbit.values, complete: orbit.complete},
                    width, height, depth, palette, newWorker, onComplete: finish, onError: reject});
            }
        }), 1500);
    });
}

// How alike two images are, 0 to 1: the share of pixels within 24 of each other in every channel.
export function alike(a, b) {
    let same = 0;
    for (let p = 0; p < a.length; p += 4) {
        if (Math.abs(a[p] - b[p]) <= 24 && Math.abs(a[p + 1] - b[p + 1]) <= 24 && Math.abs(a[p + 2] - b[p + 2]) <= 24) same += 1;
    }
    return same / (a.length / 4);
}
