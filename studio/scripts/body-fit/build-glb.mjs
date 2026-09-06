#!/usr/bin/env node
/**
 * Write the abdomen targets into both meshes.
 *
 *   node scripts/body-fit/build-glb.mjs
 *
 * Source is `datasets/glb-body/`, which stays pristine; the build output is
 * `studio/public/models/`. Re-running it from the source is what makes the
 * abdomen system reproducible rather than a one-off edit to a binary.
 *
 * The new targets are stored as **sparse accessors**: each one moves between
 * 200 and 1,000 of the mesh's 13,380 vertices, so the dense form would add
 * 2.2 MB to a 6.9 MB file the scanner downloads on open, and the sparse form
 * adds about 100 KB.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb, accessor } from './parse.mjs';
import {
  buildAbdomenDeltas, vertexNormals, weldByPosition,
  ABDOMEN_MORPHS, PROGRAM, PROGRAM_STOPS, PROGRAM_STAGES,
} from './abdomen-morphs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, '../..');
const repo = path.resolve(studio, '..');

/** Anything smaller than a fiftieth of a millimetre is not worth a row. */
const EPSILON = 2e-5;

const align4 = (n) => n + ((4 - (n % 4)) % 4);

function build(sex) {
  const src = path.join(repo, 'datasets/glb-body', `sportmind-${sex}.glb`);
  const dst = path.join(studio, 'public/models', `sportmind-${sex}.glb`);
  const gltf = readGlb(src);
  const json = JSON.parse(JSON.stringify(gltf.json));
  const prim = json.meshes[0].primitives[0];

  if (json.meshes[0].extras.targetNames.some((n) => ABDOMEN_MORPHS.includes(n))) {
    throw new Error(`${src} already carries abdomen targets — build from the pristine source`);
  }

  const base = accessor(gltf, gltf.bin, prim.attributes.POSITION).data;
  const index = accessor(gltf, gltf.bin, prim.indices).data;
  const body = { base, index, vertexCount: base.length / 3 };

  const { deltas, landmarks } = buildAbdomenDeltas(body);
  const weld = weldByPosition(base);
  const baseNormals = vertexNormals(index, base, weld);

  const chunks = [gltf.bin];           // the original BIN, untouched
  let offset = gltf.bin.length;
  const pushView = (buf) => {
    const pad = align4(offset) - offset;
    if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    const view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    chunks.push(buf); offset += buf.length;
    json.bufferViews.push(view);
    return json.bufferViews.length - 1;
  };

  /** One sparse VEC3 float accessor over the whole vertex range. */
  const pushSparse = (values, count) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      const m = Math.hypot(values[i * 3], values[i * 3 + 1], values[i * 3 + 2]);
      if (m > EPSILON) rows.push(i);
    }
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    // Zero counts too: the dense part of the accessor is zero everywhere else.
    for (let c = 0; c < 3; c++) { min[c] = 0; max[c] = 0; }
    const idxBuf = Buffer.alloc(rows.length * 4);
    const valBuf = Buffer.alloc(rows.length * 12);
    rows.forEach((i, k) => {
      idxBuf.writeUInt32LE(i, k * 4);
      for (let c = 0; c < 3; c++) {
        const v = values[i * 3 + c];
        valBuf.writeFloatLE(v, k * 12 + c * 4);
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    });
    const acc = {
      componentType: 5126, count, type: 'VEC3', min, max,
      sparse: {
        count: rows.length,
        indices: { bufferView: pushView(idxBuf), byteOffset: 0, componentType: 5125 },
        values: { bufferView: pushView(valBuf), byteOffset: 0 },
      },
    };
    json.accessors.push(acc);
    return { index: json.accessors.length - 1, rows: rows.length };
  };

  const report = [];
  for (const name of ABDOMEN_MORPHS) {
    const dPos = deltas[name];
    const deformed = Float64Array.from(base);
    for (let k = 0; k < deformed.length; k++) deformed[k] += dPos[k];
    const n2 = vertexNormals(index, deformed, weld);
    const dNor = new Float64Array(dPos.length);
    for (let k = 0; k < dNor.length; k++) dNor[k] = n2[k] - baseNormals[k];

    const P = pushSparse(dPos, body.vertexCount);
    const N = pushSparse(dNor, body.vertexCount);
    prim.targets.push({ POSITION: P.index, NORMAL: N.index });
    json.meshes[0].extras.targetNames.push(name);
    json.meshes[0].weights.push(0);
    report.push({ name, positions: P.rows, normals: N.rows });
  }

  const bin = Buffer.concat(chunks);
  json.buffers[0].byteLength = bin.length;
  json.asset.generator = `${json.asset.generator}; abdomen system by scripts/body-fit/build-glb.mjs`;

  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.alloc(align4(jsonBuf.length) - jsonBuf.length, 0x20);
  const binPad = Buffer.alloc(align4(bin.length) - bin.length, 0);
  const jsonChunk = Buffer.concat([jsonBuf, jsonPad]);
  const binChunk = Buffer.concat([bin, binPad]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(jsonChunk.length, 0); jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(binChunk.length, 0); binHead.writeUInt32LE(0x004e4942, 4);

  const out = Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk]);
  fs.writeFileSync(dst, out);

  const before = fs.statSync(src).size;
  console.log(`${sex}: ${json.meshes[0].extras.targetNames.length} targets, ` +
    `${(before / 1e6).toFixed(2)} MB -> ${(out.length / 1e6).toFixed(2)} MB ` +
    `(+${((out.length - before) / 1024).toFixed(0)} KB)`);
  console.log('  landmarks ' + Object.entries(landmarks).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(' '));
  for (const r of report) console.log(`  ${r.name.padEnd(24)} ${String(r.positions).padStart(5)} vertices`);
}

build('male');
build('female');

/**
 * The program, written out for the runtime.
 *
 * The engine has to expand a belly amount into the same seven influences this
 * script authored the geometry for, so the numbers live in one place and are
 * copied to where TypeScript can import them rather than retyped.
 */
fs.writeFileSync(
  path.join(studio, 'src/lib/body-fit/abdomen-program.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: 'Generated by scripts/body-fit/build-glb.mjs — edit scripts/body-fit/abdomen-morphs.mjs, not this file.',
    morphs: ABDOMEN_MORPHS,
    stops: PROGRAM_STOPS,
    stages: PROGRAM_STAGES,
    program: PROGRAM,
  }, null, 1) + '\n',
);
console.log('wrote src/lib/body-fit/abdomen-program.json');
