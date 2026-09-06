# Body-fit calibration

`src/lib/body-fit/calibration.json` is **measured off the shipped GLBs**, not
hand-tuned. The report that came with the meshes is explicit that they carry no
kg-to-morph conversion and no anatomical landmarks — `Chest_Large = 0.5` does
not mean 108 cm — so the numbers had to come from the geometry itself.

## How a circumference is measured

A tape measure cannot enter a concavity, so a circumference is the **convex-hull
perimeter of a horizontal cross-section**. The mesh is deformed, sliced at a
plane, and the slice is split along X to separate body parts — the A-pose puts
the fingertips at hip height, so a naive hull at chest level spans 270 cm.

The gap that separates one part from another is per-measurement, not global: at
2 cm a full chest beside a full upper arm merges into one cluster, but at 1.5 cm
the waist fragments on its own soft-tissue concavity and reads 38 cm instead of
77.

## How a landmark is chosen

Once per height frame, and only where it survives that region's own morph at
both extremes plus both body-composition extremes. Searching for the extremum
on every deformed body was unstable — a degenerate slice won, and an athlete
asking for a 78 cm waist was fitted to a 47 cm one with `Waist_Large` at full.

## Evidence the rig is right

It reproduces the report's documented heights to 0.05 cm: male
159.1 / 178 / 207.8 against a documented 159.12 / 178 / 207.76.

## Running it

    node scripts/body-fit/calibrate.mjs     # regenerates calibration.json (~20s)
    node scripts/body-fit/final-test.mjs    # fits profiles, measures the result

`final-test.mjs` needs the engine compiled to CommonJS first:

    node node_modules/typescript/lib/tsc.js src/lib/body-fit/index.ts \
      --outDir <dir>/fit --module commonjs --target es2020 \
      --moduleResolution node --resolveJsonModule --skipLibCheck --esModuleInterop

Both read the GLBs from `datasets/glb-body/`.
