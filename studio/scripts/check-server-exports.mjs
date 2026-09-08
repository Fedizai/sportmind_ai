/**
 * Guards the one rule a `'use server'` file has: it may only export async
 * functions.
 *
 * Next.js checks this when the module is first loaded on the server, not while
 * building, so a file that breaks it compiles cleanly, deploys cleanly, and
 * then throws `A "use server" file can only export async functions, found
 * object` on the first call — taking every other export of that module down
 * with it. That is how the body scanner shipped broken: it exported two Zod
 * schemas, so `analyzeBody` failed before it ran, and the page could only say
 * the analysis had not worked.
 *
 * Type-only exports are erased at compile time and are allowed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not `.pathname`: this repo lives under a directory with a
// space in its name, which a URL keeps percent-encoded.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Every .ts/.tsx file under src, ignoring build output. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** The directive only counts when it sits at the top of the file. */
function isServerModule(source) {
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    return /^(['"])use server\1;?$/.test(trimmed);
  }
  return false;
}

const OFFENDERS = [
  { re: /^export\s+(const|let|var)\s+/, what: 'a value' },
  { re: /^export\s+(class|enum)\s+/, what: 'a class or enum' },
  { re: /^export\s+default\s+(?!async\b)/, what: 'a non-async default' },
  { re: /^export\s+function\s+/, what: 'a synchronous function' },
  { re: /^export\s*\{/, what: 're-exported bindings' },
];

const problems = [];
for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  if (!isServerModule(source)) continue;
  source.split('\n').forEach((line, i) => {
    // `export type` and `export interface` disappear at compile time.
    if (/^export\s+(type|interface)\b/.test(line)) return;
    for (const { re, what } of OFFENDERS) {
      if (re.test(line)) problems.push({ file: relative(ROOT, file), line: i + 1, what, text: line.trim() });
    }
  });
}

if (problems.length > 0) {
  console.error("\nA 'use server' file can only export async functions.\n");
  for (const p of problems) console.error(`  ${p.file}:${p.line}  exports ${p.what}\n    ${p.text}`);
  console.error('\nKeep it unexported, or move it to a file without the directive.\n');
  process.exit(1);
}
