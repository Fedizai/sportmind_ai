#!/usr/bin/env node
/**
 * Converts the Kaggle "Global Food & Nutrition Database 2026" CSVs into one
 * compact JSON the nutrition search loads into memory at runtime.
 *
 *   node scripts/build-food-db.mjs <usda.csv> [openfoodfacts.csv]
 *
 * Only the fields the app actually renders are kept, which takes the payload
 * from ~40 MB of CSV down to a few MB — small enough to hold in memory on a
 * single Cloud Run instance and search without any network call.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas and "". */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

function loadCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  return { rows, idx };
}

const [usdaPath, offPath] = process.argv.slice(2);
if (!usdaPath) {
  console.error('Usage: node scripts/build-food-db.mjs <comprehensive_foods_usda.csv> [foods_health_scores_allergens.csv]');
  process.exit(1);
}

const out = [];

// ---- USDA file ----
{
  const { rows, idx } = loadCsv(usdaPath);
  const c = {
    id: idx('fdc_id'), name: idx('food_name'), brand: idx('brand_name'),
    cal: idx('calories'), pro: idx('protein_g'), fat: idx('fat_g'), carb: idx('carbs_g'),
    sug: idx('sugar_g'), sod: idx('sodium_mg'), iron: idx('iron_mg'),
    serving: idx('serving_size'),
  };
  for (const r of rows) {
    const name = (r[c.name] || '').trim();
    if (!name) continue;
    const cal = num(r[c.cal]);
    // Skip rows with no usable energy value — they cannot be logged meaningfully.
    if (cal <= 0) continue;
    out.push({
      i: r[c.id] || `u${out.length}`,
      n: name,
      b: c.brand > -1 ? (r[c.brand] || '').trim() : '',
      c: cal,
      p: num(r[c.pro]), f: num(r[c.fat]), g: num(r[c.carb]),
      s: num(r[c.sug]), so: num(r[c.sod]), ir: num(r[c.iron]),
      pt: c.serving > -1 ? num(r[c.serving]) || 100 : 100,
    });
  }
  console.log(`USDA        : ${out.length} aliments retenus`);
}

// ---- Open Food Facts file (optional) ----
if (offPath && fs.existsSync(offPath)) {
  const before = out.length;
  const { rows, idx } = loadCsv(offPath);
  const c = {
    name: idx('product_name'), brand: idx('brands'),
    cal: idx('energy-kcal_100g') > -1 ? idx('energy-kcal_100g') : idx('calories'),
    pro: idx('proteins_100g') > -1 ? idx('proteins_100g') : idx('protein_g'),
    fat: idx('fat_100g') > -1 ? idx('fat_100g') : idx('fat_g'),
    carb: idx('carbohydrates_100g') > -1 ? idx('carbohydrates_100g') : idx('carbs_g'),
    sug: idx('sugars_100g') > -1 ? idx('sugars_100g') : idx('sugar_g'),
    sod: idx('sodium_100g') > -1 ? idx('sodium_100g') : idx('sodium_mg'),
    nutri: idx('nutriscore_grade'), nova: idx('nova_group'), allerg: idx('allergens'),
  };
  for (const r of rows) {
    const name = (r[c.name] || '').trim();
    if (!name) continue;
    const cal = num(r[c.cal]);
    if (cal <= 0) continue;
    out.push({
      i: `off${out.length}`,
      n: name,
      b: c.brand > -1 ? (r[c.brand] || '').trim() : '',
      c: cal, p: num(r[c.pro]), f: num(r[c.fat]), g: num(r[c.carb]),
      s: num(r[c.sug]), so: num(r[c.sod]), ir: 0, pt: 100,
      ns: c.nutri > -1 ? (r[c.nutri] || '').trim().toUpperCase() : '',
      nv: c.nova > -1 ? num(r[c.nova]) : 0,
      al: c.allerg > -1 ? (r[c.allerg] || '').trim().slice(0, 160) : '',
    });
  }
  console.log(`OpenFoodFacts: ${out.length - before} produits ajoutés`);
}

// Drop duplicate names (keep the first, which is the richer USDA entry).
const seen = new Set();
const deduped = out.filter((x) => {
  const k = (x.n + '|' + x.b).toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const dest = path.join(process.cwd(), 'data', 'food-db.json');
fs.writeFileSync(dest, JSON.stringify(deduped));
const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ ${deduped.length} aliments -> data/food-db.json (${mb} Mo)`);
