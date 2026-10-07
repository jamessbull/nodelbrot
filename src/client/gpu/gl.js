// Small helpers for WebGL2.

// A WebGL2 context on a new canvas that can render to 32-bit float textures, which the GPU renderer
// keeps its pixels' state in, and blend into them, which it counts escapes with, or null if the browser
// can't.
export function createFloatContext(width = 1, height = 1) {
    if (typeof document === "undefined") {
        return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext("webgl2", {antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false,
        powerPreference: "high-performance"});
    if (!gl || !gl.getExtension("EXT_color_buffer_float") || !gl.getExtension("EXT_float_blend")) {
        return null;
    }
    return gl;
}

let available;

// Whether the GPU renderer can run here.
export function gpuAvailable() {
    if (available === undefined) {
        const gl = createFloatContext();
        available = Boolean(gl);
        if (gl) {
            const lose = gl.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
        }
    }
    return available;
}

export function createProgram(gl, vertexSource, fragmentSource) {
    const compile = function (type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Shader didn't compile: " + gl.getShaderInfoLog(shader));
        }
        return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Shaders didn't link: " + gl.getProgramInfoLog(program));
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i += 1) {
        const name = gl.getActiveUniform(program, i).name;
        uniforms[name] = gl.getUniformLocation(program, name);
    }
    return {program, uniforms};
}

// A texture to read with texelFetch: no filtering, no mipmaps.
export function createTexture(gl, internalFormat, width, height, format, type, data = null) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
    return texture;
}

// A framebuffer drawing to textures, one per colour attachment.
export function createFramebuffer(gl, textures) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    textures.forEach((texture, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0));
    gl.drawBuffers(textures.map((texture, i) => gl.COLOR_ATTACHMENT0 + i));
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Framebuffer isn't complete: " + status);
    }
    return framebuffer;
}

// A vertex shader for drawing one triangle that covers the whole target, so a fragment shader runs once
// per pixel.
export const fullScreenVertexShader = `#version 300 es
void main() {
    vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;
