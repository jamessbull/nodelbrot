// The GPU renderer's shaders. Each pixel's state is in two RGBA float textures, read from one pair and
// written to the other (ping-pong):
//
//     state0: d.x, d.y, m, escapedAt   d is the pixel's difference from the reference orbit, m where in
//                                      the orbit it is, escapedAt the iteration |z|^2 passed 16 (or 0)
//     state1: imageEscapedAt, smooth   when it passed the image escape value (or 0), and its smoothed
//                                      escape iteration for colouring
//
// Pixel (i, j), with j counted down from the top, is texel (i, j). Long arrays (the reference orbit, the
// histogram) are 2D textures `width` texels wide, as 1D ones can't be long enough.

export const arrayTextureWidth = 2048;

const fetchArray = `
const int arrayWidth = ${arrayTextureWidth};
ivec2 arrayTexel(int i) {
    return ivec2(i % arrayWidth, i / arrayWidth);
}`;

// Advances every pixel by up to `iterations` iterations, by perturbation from the reference orbit (see
// perturbationIterator.js, which this follows step for step, in 32-bit floats). orbitEnd is the index of
// the reference orbit's last value if it is complete (escaped, or a nucleus's whole period), so pixels
// rebase on reaching it, otherwise -1.
export const iterateShader = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D state0;
uniform highp sampler2D state1;
uniform highp sampler2D orbit;
uniform int orbitEnd;
uniform float startIteration;
uniform int iterations;
uniform vec2 dcTopLeft;
uniform float pixelSize;
layout(location = 0) out vec4 next0;
layout(location = 1) out vec4 next1;
${fetchArray}
const float histogramEscapeValue = 16.0;
const float imageEscapeValue = 9007199254740991.0;

vec2 Z(int m) {
    return texelFetch(orbit, arrayTexel(m), 0).xy;
}

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    vec4 s0 = texelFetch(state0, pixel, 0);
    vec4 s1 = texelFetch(state1, pixel, 0);
    next0 = s0;
    next1 = s1;
    if (s1.x != 0.0) {
        return;
    }
    vec2 dc = dcTopLeft + vec2(pixel) * pixelSize;
    vec2 d = s0.xy;
    int m = int(s0.z);
    float escapedAt = s0.w;
    for (int n = 1; n <= iterations; n++) {
        vec2 Zm = Z(m);
        vec2 z = Zm + d;
        float zSquared = dot(z, z);
        if (zSquared < imageEscapeValue) {
            d = vec2(2.0 * (Zm.x * d.x - Zm.y * d.y) + (d.x * d.x - d.y * d.y),
                     2.0 * (Zm.x * d.y + Zm.y * d.x + d.x * d.y)) + dc;
            m += 1;
            vec2 nextZ = Z(m) + d;
            if (dot(nextZ, nextZ) < dot(d, d) || m == orbitEnd) {
                d = nextZ;
                m = 0;
            }
        }
        if (escapedAt == 0.0 && zSquared > histogramEscapeValue) {
            escapedAt = startIteration + float(n);
        }
        if (zSquared > imageEscapeValue) {
            float at = startIteration + float(n);
            next1 = vec4(at, at + 1.0 - log2(log2(zSquared) / 2.0), 0.0, 0.0);
            break;
        }
    }
    next0 = vec4(d, float(m), escapedAt);
}`;

// Starts the pixels still going again from the start of a new reference orbit (see rereference.js),
// keeping those that have escaped, and when any passed the histogram's escape value.
export const restartSurvivorsShader = `#version 300 es
precision highp float;
uniform highp sampler2D state0;
uniform highp sampler2D state1;
layout(location = 0) out vec4 next0;
layout(location = 1) out vec4 next1;
void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    vec4 s0 = texelFetch(state0, pixel, 0);
    vec4 s1 = texelFetch(state1, pixel, 0);
    if (s1.x != 0.0) {
        next0 = s0;
        next1 = s1;
    } else {
        next0 = vec4(0.0, 0.0, 0.0, s0.w);
        next1 = vec4(0.0);
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
    if (s1.x == 0.0 || s1.x > depth) {
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
