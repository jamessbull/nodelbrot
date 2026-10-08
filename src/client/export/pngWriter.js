// Writes a PNG without a canvas, so its size isn't limited by the browser's canvas limits, and without
// ever holding the whole image uncompressed: rows(from, to) gives rows from to to (not including to) of
// the width x height image as RGBA data, and is asked for a strip of them at a time, each compressed (by
// the browser's own deflate) before the next. onProgress(rowsDone) is called as strips are done. Resolves
// with the PNG as a Blob.
//
// Each row is filtered with PNG's Sub filter (each byte less the one a pixel to its left), which makes
// the images' smooth gradients compress far better than the plain bytes.
export async function writePng(width, height, rows, {stripBytes = 16 * 1024 * 1024, onProgress = () => {}} = {}) {
    const rowBytes = 1 + (width * 4);
    const rowsPerStrip = Math.max(1, Math.floor(stripBytes / rowBytes));
    const compression = new CompressionStream("deflate");
    const writer = compression.writable.getWriter();
    const parts = [signature, chunk("IHDR", header(width, height))];
    const compressed = (async function () {
        const reader = compression.readable.getReader();
        for (;;) {
            const {done, value} = await reader.read();
            if (done) return;
            parts.push(chunk("IDAT", value));
        }
    }());
    for (let from = 0; from < height; from += rowsPerStrip) {
        const to = Math.min(height, from + rowsPerStrip);
        await writer.write(filtered(rows(from, to), width, to - from));
        onProgress(to);
    }
    await writer.close();
    await compressed;
    parts.push(chunk("IEND", new Uint8Array(0)));
    return new Blob(parts, {type: "image/png"});
}

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

// 8 bits a channel, RGBA (colour type 6), not interlaced.
function header(width, height) {
    const data = new Uint8Array(13);
    const view = new DataView(data.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    data.set([8, 6, 0, 0, 0], 8);
    return data;
}

// RGBA rows with the Sub filter, each after its filter type byte (1).
function filtered(rgba, width, rowCount) {
    const rowBytes = 1 + (width * 4);
    const out = new Uint8Array(rowBytes * rowCount);
    for (let row = 0; row < rowCount; row += 1) {
        const from = row * width * 4;
        const at = row * rowBytes;
        out[at] = 1;
        for (let i = 0; i < 4; i += 1) {
            out[at + 1 + i] = rgba[from + i];
        }
        for (let i = 4; i < width * 4; i += 1) {
            out[at + 1 + i] = rgba[from + i] - rgba[from + i - 4];
        }
    }
    return out;
}

// A PNG chunk: its length, type, data and the CRC of its type and data, as Blob parts.
function chunk(type, data) {
    const typeBytes = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0, data.length);
    const crc = new Uint8Array(4);
    new DataView(crc.buffer).setUint32(0, crc32(data, crc32(typeBytes)) ^ 0xFFFFFFFF);
    return new Blob([length, typeBytes, data, crc]);
}

const crcTable = new Uint32Array(256).map(function (unused, n) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    return c;
});

// The CRC-32 of bytes, carrying on from crc (before its final inversion).
function crc32(bytes, crc = 0xFFFFFFFF) {
    let c = crc;
    for (let i = 0; i < bytes.length; i += 1) {
        c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return c >>> 0;
}
