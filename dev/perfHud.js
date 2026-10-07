// Performance HUD, injected by dev/server.js. Not part of the shipped page.
//
// The renderer adapts its step size to hold a roughly constant frame rate, so fps alone
// doesn't show speed-ups. The headline number is iteration depth reached per second.
// The benchmark measures the time from a view being set (page load, zoom, move or bookmark)
// until the iteration depth reaches the target (default 5000, override with ?bench=N).
(function () {
    "use strict";
    const target = Number(new URLSearchParams(window.location.search).get("bench")) || 5000;
    const windowMs = 1000;
    let samples = [];          // {t, depth} for each completed frame within windowMs
    let depth = 0;
    let running = true;
    let bench;
    const history = loadHistory();
    let panel;
    let orbit = null;          // {length, escaped} of the view's reference orbit, if it has one

    function now() { return performance.now(); }

    function loadHistory() {
        try {
            return JSON.parse(localStorage.getItem("nodelbrot.bench") || "[]");
        } catch {
            return [];
        }
    }

    function saveHistory() {
        try {
            localStorage.setItem("nodelbrot.bench", JSON.stringify(history.slice(-20)));
        } catch { /* storage unavailable */ }
    }

    function viewName() {
        return window.location.hash.length > 1 ? "bookmark:" + window.location.hash.length : "default";
    }

    function startBenchmark() {
        bench = {start: now(), frames: 0, done: false, view: viewName()};
        samples = [];
        depth = 0;
    }

    function finishBenchmark() {
        const ms = now() - bench.start;
        const result = {
            view: bench.view,
            target: target,
            ms: ms,
            frames: bench.frames,
            avgFrameMs: ms / bench.frames,
            browser: browserName()
        };
        bench.done = true;
        bench.result = result;
        history.push({ms: Math.round(ms), view: result.view, target: target, at: new Date().toISOString()});
        saveHistory();
        console.log("[bench] depth " + target + " reached in " + (ms / 1000).toFixed(2) + "s (" +
            bench.frames + " frames, avg " + result.avgFrameMs.toFixed(1) + "ms/frame)");
        fetch("/dev/bench", {method: "POST", body: JSON.stringify(result)}).catch(function () {});
    }

    function browserName() {
        const m = navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/(\d+)/);
        return m ? m[1] + "/" + m[2] : "unknown";
    }

    function onFrame() {
        const t = now();
        samples.push({t: t, depth: depth});
        while (samples.length > 2 && t - samples[0].t > windowMs) {
            samples.shift();
        }
        if (bench && !bench.done) {
            bench.frames += 1;
            if (depth >= target) {
                finishBenchmark();
            }
        }
        render();
    }

    function rates() {
        if (samples.length < 2) return {fps: 0, frameMs: 0, depthPerSec: 0, step: 0};
        const first = samples[0], last = samples[samples.length - 1];
        const seconds = (last.t - first.t) / 1000;
        const frames = samples.length - 1;
        return {
            fps: frames / seconds,
            frameMs: (seconds * 1000) / frames,
            depthPerSec: (last.depth - first.depth) / seconds,
            step: (last.depth - first.depth) / frames
        };
    }

    function row(label, value) {
        return "<tr><td>" + label + "</td><td>" + value + "</td></tr>";
    }

    function render() {
        if (!panel) return;
        const r = rates();
        let benchText;
        if (!bench) {
            benchText = "waiting";
        } else if (bench.done) {
            benchText = (bench.result.ms / 1000).toFixed(2) + "s";
        } else if (!running) {
            benchText = "auto-stopped at " + depth;
        } else {
            benchText = ((now() - bench.start) / 1000).toFixed(1) + "s…";
        }
        const view = bench ? bench.view : viewName();
        const comparable = history.filter(function (h) { return h.target === target && h.view === view; });
        const previous = comparable.slice(-4, bench && bench.done ? -1 : undefined).map(function (h) {
            return (h.ms / 1000).toFixed(2) + "s";
        }).join(", ");

        panel.innerHTML = "<table>" +
            row("state", running ? "running" : "stopped") +
            row("depth", depth) +
            row("depth/s", running ? Math.round(r.depthPerSec) : "-") +
            row("frame", running ? r.frameMs.toFixed(1) + " ms" : "-") +
            row("fps", running ? r.fps.toFixed(1) : "-") +
            row("step", running ? Math.round(r.step) : "-") +
            row("bench→" + target, benchText) +
            (previous ? row("previous", previous) : "") +
            (orbit ? row("orbit", orbit.length + (orbit.escaped ? " (escaped)" : "")) : "") +
            "</table>";
    }

    function createPanel() {
        panel = document.createElement("div");
        panel.id = "perfHud";
        panel.style.cssText = "position:fixed;top:64px;left:20px;z-index:10000;padding:6px 10px;" +
            "background:rgba(0,0,0,0.75);color:#9f9;font:12px/1.4 monospace;border-radius:4px;pointer-events:none;";
        document.body.appendChild(panel);
        render();
        setInterval(render, 250);
    }

    // The explorer sends out its events as it starts, before it sets the first view.
    window.addEventListener("nodelbrotstart", function (e) {
        const events = e.detail;
        events.listenTo(events.viewChanged, startBenchmark);
        events.listenTo(events.viewChanged, function () { orbit = null; });
        // It grows as rendering goes deeper, so how fast it grows says nothing about how fast it is made.
        events.listenTo(events.referenceOrbitGrew, function (grew) { orbit = grew; });
        events.listenTo(events.depthReached, function (iteration) { depth = iteration; });
        events.listenTo(events.frameComplete, onFrame);
        events.listenTo(events.stop, function () { running = false; });
        events.listenTo(events.restart, function () { running = true; });
        events.listenTo(events.start, function () { running = true; });
    });
    document.addEventListener("DOMContentLoaded", createPanel);
}());
