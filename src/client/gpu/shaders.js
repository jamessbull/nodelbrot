import { minLevel as blaMinLevel } from "../worker/bla.js";

// The GPU renderer's shaders. Each pixel's state is in three RGBA float textures, read from one set
// and written to the other (ping-pong):
//
//     state0: d.x, d.y, m, escapedAt   d is the pixel's difference from the reference orbit, m where in
//                                      the orbit it is, escapedAt the iteration |z|^2 passed 16 (or 0)
//     state1: imageEscapedAt, smooth,  when it passed the image escape value (or 0, or -1 if it is known
//             sinceKept, power         to be in the set), its smoothed escape iteration for colouring,
//                                      the iterations since state2 was kept, and deep in, the power of
//                                      two d's mantissa (in state0) is to be multiplied by
//     state2: d.x, d.y, m, window      a state kept from the pixel's orbit, to find cycles by, replaced
//                                      after window iterations, which doubles each time (with d's power)
//
// Pixel (i, j), with j counted down from the top, is texel (i, j). Long arrays (the reference orbit, the
// histogram) are 2D textures `width` texels wide, as 1D ones can't be long enough.

export const arrayTextureWidth = 2048;

// The most levels of runs the bivariate linear approximation table can have on the GPU (see gpuBla.js),
// and the shortest run, 2^blaMinLevel (see bla.js).
export const maxBlaLevels = 24;

// Pixels smaller than this are iterated by the deep iterate shader, which keeps d as a mantissa and a
// power of two, as 32-bit floats alone run out soon after (about 1e-38).
export const deepGpuPixel = 1e-25;

// Sets where the iterate shader's pixels are: the top left one at (x, y) from the reference orbit's point
// and the rest stepX, stepY apart, as dcTopLeft, pixelStep and dcPower. For the deep shader they are
// mantissas, with the power of two for the pixel size; otherwise as they are, with no power.
export function placePixels(gl, program, x, y, stepX, stepY, deep) {
    const power = deep ? Math.floor(Math.log2(Math.max(Math.abs(stepX), Math.abs(stepY)))) : 0;
    // In two steps, as 2^-power alone can be out of range.
    const half = Math.trunc(-power / 2);
    const scale = (v) => v * (2 ** half) * (2 ** (-power - half));
    gl.uniform2f(program.uniforms.dcTopLeft, scale(x), scale(y));
    gl.uniform2f(program.uniforms.pixelStep, scale(stepX), scale(stepY));
    gl.uniform1i(program.uniforms.dcPower, power);
}

const fetchArray = `
const int arrayWidth = ${arrayTextureWidth};
ivec2 arrayTexel(int i) {
    return ivec2(i % arrayWidth, i / arrayWidth);
}`;

// Advances every pixel by up to `iterations` iterations, by perturbation from the reference orbit (see
// perturbationIterator.js, which this follows step for step, in 32-bit floats). orbitEnd is the index of
// the reference orbit's last value if it is complete (escaped, or a nucleus's whole period), so pixels
// rebase on reaching it, otherwise -1. Pixel (i, j) is (dcTopLeft + (i, j) pixelStep) 2^dcPower from the
// orbit's point. Pixels whose imageEscapedAt is set are left as they are: those that have escaped, and
// those known to be in the set, which have -1.
//
// As on the CPU, a pixel whose state (m and d) comes round to exactly what it was is in a cycle, so in
// the set, and gets -1; and while d is small enough, runs of iterations are taken in one step, from a
// bivariate linear approximation table (see bla.js and gpuBla.js), if blaLevels is more than 0.
//
// Deep in (pixels smaller than deepGpuPixel), d is smaller than 32-bit floats go, so the deep shader keeps
// it as a mantissa and a power of two (state1.w), which every step works with, adding the terms at
// whichever power is biggest (terms too small to show there drop out, as they would anyway).
export function iterateShader(deep) {
    return `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D state0;
uniform highp sampler2D state1;
uniform highp sampler2D state2;
uniform highp sampler2D orbit;
uniform int orbitEnd;
uniform float startIteration;
uniform int iterations;
uniform vec2 dcTopLeft;
uniform vec2 pixelStep;
uniform int dcPower;
uniform highp sampler2D blaCoefficients;
uniform highp sampler2D blaScales;
uniform int blaLevels;
uniform int blaStart[${maxBlaLevels}];
uniform int blaCount[${maxBlaLevels}];
uniform float blaMostLog2R;
layout(location = 0) out vec4 next0;
layout(location = 1) out vec4 next1;
layout(location = 2) out vec4 next2;
${fetchArray}
const bool deep = ${deep ? "true" : "false"};
const float histogramEscapeValue = 16.0;
const float imageEscapeValue = 9007199254740991.0;
const int shortestRun = ${2 ** blaMinLevel};
const int shortestShift = ${blaMinLevel};

vec2 Z(int m) {
    return texelFetch(orbit, arrayTexel(m), 0).xy;
}

vec2 times(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// d as a plain number, from its mantissa and power (0, if too small for 32-bit floats).
vec2 plain(vec2 d, int power) {
    return deep ? d * exp2(float(power)) : d;
}

// Rebasing: d becomes Zm + d, where Zm is a plain number, as a mantissa and power, so d isn't lost when
// it is too small for 32-bit floats (as it is next to a nucleus's Zm of 0, deep in).
void rebase(vec2 Zm, inout vec2 d, inout int power) {
    if (!deep) {
        d = Zm + d;
        return;
    }
    float size = max(abs(Zm.x), abs(Zm.y));
    if (size == 0.0) {
        return;
    }
    int zPower = int(floor(log2(size)));
    int top = (d.x == 0.0 && d.y == 0.0) ? zPower : max(zPower, power);
    d = Zm * exp2(float(-top)) + d * exp2(float(power - top));
    power = top;
}

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    vec4 s0 = texelFetch(state0, pixel, 0);
    vec4 s1 = texelFetch(state1, pixel, 0);
    vec4 s2 = texelFetch(state2, pixel, 0);
    next0 = s0;
    next1 = s1;
    next2 = s2;
    if (s1.x != 0.0) {
        return;
    }
    vec2 dc = dcTopLeft + vec2(pixel) * pixelStep;
    vec2 d = s0.xy;
    int power = deep ? int(s1.w) : 0;
    int m = int(s0.z);
    float escapedAt = s0.w;
    // The state kept for finding cycles (state2: d, m, and its power and log2 of the window, as
    // (power + 4096) 64 + log2 window), and the iterations since.
    vec2 refD = s2.xy;
    int refM = int(s2.z);
    int refPower = int(floor(s2.w / 64.0)) - 4096;
    float log2Window = mod(s2.w, 64.0);
    float window = exp2(log2Window);
    float sinceRef = s1.z;
    bool done = false;
    int n = 0;
    while (n < iterations) {
        // The longest run that starts here, fits in what's left, and d is small enough for (see
        // perturbationIterator.js).
        if (blaLevels > 0 && m > 0 && ((m - 1) & (shortestRun - 1)) == 0 && shortestRun <= iterations - n) {
            float log2D = 0.5 * log2(dot(d, d)) + float(power);
            int from = m - 1;
            int first = from >> shortestShift;
            if (log2D < blaMostLog2R && first < blaCount[0] && log2D < texelFetch(blaScales, arrayTexel(blaStart[0] + first), 0).x) {
                int level = 0;
                int at = blaStart[0] + first;
                for (int up = 1; up < ${maxBlaLevels}; up++) {
                    int run = shortestRun << up;
                    if (up >= blaLevels || (from & (run - 1)) != 0 || run > iterations - n) break;
                    int upFirst = from >> (shortestShift + up);
                    if (upFirst >= blaCount[up] || log2D >= texelFetch(blaScales, arrayTexel(blaStart[up] + upFirst), 0).x) break;
                    level = up;
                    at = blaStart[up] + upFirst;
                }
                // d = A d + B dc, each a mantissa and a power of two, added at the bigger power.
                vec4 ab = texelFetch(blaCoefficients, arrayTexel(at), 0);
                vec4 scale = texelFetch(blaScales, arrayTexel(at), 0);
                int aPower = int(scale.y) + power;
                int bPower = int(scale.z) + dcPower;
                int top = max(aPower, bPower);
                d = times(ab.xy, d) * exp2(float(aPower - top)) + times(ab.zw, dc) * exp2(float(bPower - top));
                power = top;
                if (!deep) {
                    d *= exp2(float(power));
                    power = 0;
                }
                m += shortestRun << level;
                n += shortestRun << level;
                if (m == orbitEnd) {
                    rebase(Z(m), d, power);
                    m = 0;
                }
                continue;
            }
        }
        n += 1;
        vec2 Zm = Z(m);
        vec2 z = Zm + plain(d, power);
        float zSquared = dot(z, z);
        if (zSquared < imageEscapeValue) {
            if (deep) {
                // 2 Z d + d^2 + dc, at the biggest power of the three terms (at Z = 0, the start of the
                // orbit, the first is 0, and the others can be far smaller than d).
                bool dIsZero = d.x == 0.0 && d.y == 0.0;
                bool zIsZero = Zm.x == 0.0 && Zm.y == 0.0;
                int top = dcPower;
                if (!dIsZero) {
                    top = max(top, zIsZero ? 2 * power : power);
                }
                d = (zIsZero || dIsZero ? vec2(0.0) : 2.0 * times(Zm, d) * exp2(float(power - top)))
                    + (dIsZero ? vec2(0.0) : times(d, d) * exp2(float(2 * power - top)))
                    + dc * exp2(float(dcPower - top));
                power = top;
            } else {
                d = vec2(2.0 * (Zm.x * d.x - Zm.y * d.y) + (d.x * d.x - d.y * d.y),
                         2.0 * (Zm.x * d.y + Zm.y * d.x + d.x * d.y)) + dc;
            }
            m += 1;
            vec2 dNow = plain(d, power);
            vec2 nextZ = Z(m) + dNow;
            if (dot(nextZ, nextZ) < dot(dNow, dNow) || m == orbitEnd) {
                rebase(Z(m), d, power);
                m = 0;
            }
            if (deep) {
                // Mantissas kept near 1, so neither they nor their squares go out of range.
                float size = max(abs(d.x), abs(d.y));
                if (size > 0.0 && (size > 1048576.0 || size < 1.0 / 1048576.0)) {
                    int shift = int(floor(log2(size)));
                    d *= exp2(float(-shift));
                    power += shift;
                }
            }
        }
        if (escapedAt == 0.0 && zSquared > histogramEscapeValue) {
            escapedAt = startIteration + float(n);
        }
        if (zSquared > imageEscapeValue) {
            float at = startIteration + float(n);
            next1 = vec4(at, at + 1.0 - log2(log2(zSquared) / 2.0), 0.0, 0.0);
            done = true;
            break;
        }
        if (m == refM && d == refD && power == refPower) {
            next1 = vec4(-1.0, 0.0, 0.0, 0.0);
            done = true;
            break;
        }
        sinceRef += 1.0;
        if (sinceRef == window) {
            sinceRef = 0.0;
            window *= 2.0;
            log2Window += 1.0;
            refM = m;
            refD = d;
            refPower = power;
        }
    }
    next0 = vec4(d, float(m), escapedAt);
    if (!done) {
        next1.z = sinceRef;
        next1.w = float(power);
    }
    next2 = vec4(refD, float(refM), float(refPower + 4096) * 64.0 + log2Window);
}`;
}

// Starts the pixels still going again from the start of a new reference orbit (see rereference.js),
// keeping those that have escaped or are known to be in the set, and when any passed the histogram's
// escape value.
export const restartSurvivorsShader = `#version 300 es
precision highp float;
uniform highp sampler2D state0;
uniform highp sampler2D state1;
uniform highp sampler2D state2;
layout(location = 0) out vec4 next0;
layout(location = 1) out vec4 next1;
layout(location = 2) out vec4 next2;
void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    vec4 s0 = texelFetch(state0, pixel, 0);
    vec4 s1 = texelFetch(state1, pixel, 0);
    vec4 s2 = texelFetch(state2, pixel, 0);
    if (s1.x != 0.0) {
        next0 = s0;
        next1 = s1;
        next2 = s2;
    } else {
        next0 = vec4(0.0, 0.0, 0.0, s0.w);
        next1 = vec4(0.0);
        next2 = vec4(0.0);
    }
}`;

// Counts the pixels that escaped in a frame by the iteration they escaped at, from its start, for the
// histogram: drawn as a point per pixel, each added (by blending) to the texel of its iteration in an
// array texture `rows` high, and pixels that didn't escape in the frame left out of the picture.
export const countEscapesVertexShader = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D state0;
uniform int stateWidth;
uniform float startIteration;
uniform int iterations;
uniform int rows;
${fetchArray}
void main() {
    gl_PointSize = 1.0;
    float at = texelFetch(state0, ivec2(gl_VertexID % stateWidth, gl_VertexID / stateWidth), 0).w;
    int n = int(at - startIteration);
    if (at == 0.0 || at < startIteration || n >= iterations) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        return;
    }
    vec2 texel = vec2(arrayTexel(n)) + 0.5;
    gl_Position = vec4(texel / vec2(arrayWidth, rows) * 2.0 - 1.0, 0.0, 1.0);
}`;

export const countEscapesShader = `#version 300 es
precision highp float;
out vec4 count;
void main() {
    count = vec4(1.0);
}`;

// Colours escaped pixels by where their smoothed escape iteration falls in the cumulative histogram,
// against a palette lookup table, as pixelIterator.js's colourPixels does, and the rest black.
export const colourShader = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D state1;
uniform float depth;
uniform highp sampler2D histogram;
uniform float histogramFilled;
uniform float histogramCapacity;
uniform float histogramTotal;
uniform highp sampler2D palette;
uniform int paletteSize;
out vec4 colour;
${fetchArray}

// The share of pixels escaped by an iteration: entries past those filled in are zero, and past the end
// of the histogram everything has escaped.
float escapedBy(float iteration) {
    if (iteration >= histogramFilled) {
        return iteration < histogramCapacity ? 0.0 : 1.0;
    }
    float count = texelFetch(histogram, arrayTexel(int(iteration)), 0).r;
    return count == 0.0 ? 0.0 : count / histogramTotal;
}

void main() {
    vec4 s1 = texelFetch(state1, ivec2(gl_FragCoord.xy), 0);
    if (s1.x <= 0.0 || s1.x > depth) {
        colour = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float iteration = s1.y;
    float iterationFloor = floor(iteration);
    float lower = escapedBy(iterationFloor);
    float higher = escapedBy(iterationFloor + 1.0);
    int index = int((lower + (higher - lower) * fract(iteration)) * float(paletteSize - 1) + 0.5);
    colour = texelFetch(palette, ivec2(index % 128, index / 128), 0);
}`;
