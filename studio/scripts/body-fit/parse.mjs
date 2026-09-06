import fs from 'node:fs';

/** Minimal GLB reader: JSON chunk + BIN chunk, plus accessor decoding. */
export function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len + ((4 - (len % 4)) % 4) * 0;
    off += (4 - (len % 4)) % 4;
  }
  return { json, bin };
}

const COMP = { 5120: [Int8Array,1], 5121:[Uint8Array,1], 5122:[Int16Array,2], 5123:[Uint16Array,2], 5125:[Uint32Array,4], 5126:[Float32Array,4] };
const NUM = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };

export function accessor(gltf, bin, index) {
  const a = gltf.json.accessors[index];
  const [Ctor, csize] = COMP[a.componentType];
  const n = NUM[a.type];
  const out = new Float64Array(a.count * n);

  // A sparse accessor may have no bufferView at all: the dense part is zero and
  // only the listed vertices carry a value. The abdomen targets are written
  // that way — they move 200-900 of 13,380 vertices, so storing all of them
  // would add 2.2 MB per mesh to a file the scanner downloads.
  if (a.bufferView !== undefined) {
    const bv = gltf.json.bufferViews[a.bufferView];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || 0;
    if (!stride || stride === n * csize) {
      const src = new Ctor(bin.buffer, bin.byteOffset + base, a.count * n);
      for (let i = 0; i < out.length; i++) out[i] = src[i];
    } else {
      for (let i = 0; i < a.count; i++) {
        const src = new Ctor(bin.buffer, bin.byteOffset + base + i * stride, n);
        for (let c = 0; c < n; c++) out[i * n + c] = src[c];
      }
    }
  }

  if (a.sparse) {
    const iv = gltf.json.bufferViews[a.sparse.indices.bufferView];
    const vv = gltf.json.bufferViews[a.sparse.values.bufferView];
    const [ICtor] = COMP[a.sparse.indices.componentType];
    const idx = new ICtor(bin.buffer, bin.byteOffset + (iv.byteOffset || 0) + (a.sparse.indices.byteOffset || 0), a.sparse.count);
    const val = new Ctor(bin.buffer, bin.byteOffset + (vv.byteOffset || 0) + (a.sparse.values.byteOffset || 0), a.sparse.count * n);
    for (let k = 0; k < a.sparse.count; k++) {
      for (let c = 0; c < n; c++) out[idx[k] * n + c] = val[k * n + c];
    }
  }
  return { data: out, count: a.count, comps: n, min: a.min, max: a.max };
}
