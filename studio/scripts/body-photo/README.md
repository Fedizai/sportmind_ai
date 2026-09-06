# Photo measurement validation

Two modes, kept apart on purpose. Only one of them says anything about
photographs of people.

## Synthetic

    node scripts/body-photo/validate.mjs synthetic

Renders orthographic front and side silhouettes straight from the GLBs at known
measurements and runs them through the shipped pipeline. Ground truth is the
same convex-hull cross-section rig the body-fit calibration uses.

It tests: height scaling, band statistics, torso/arm and left/right leg
separation, chest localisation at the armpit, and the ellipse model.

It does **not** test: MediaPipe, camera perspective, lens distortion, clothing,
hair, lighting, background, or real segmentation noise. A number from this mode
is not evidence of real-world accuracy and must never be quoted as one.

The run also reports the per-region shape factor with leave-one-out
cross-validation, which is where the constants in
`src/lib/body-photo/circumference.ts` came from.

## Real

    node scripts/body-photo/validate.mjs real cases.json

The only mode whose MAE means anything about the product.

Node has no MediaPipe runtime here, so a case is analysed in the browser and
replayed offline:

1. Open the scanner with `?validate=1` on the URL.
2. Capture front and side as normal. When measuring finishes, a
   `body-photo-case-*.json` downloads — masks and landmarks only, never the
   photograph.
3. Write a `cases.json` alongside it:

```json
[
  {
    "name": "subject A",
    "heightCm": 178,
    "analysis": "body-photo-case-1730000000000.json",
    "truth": { "chest": 101, "waist": 84, "hips": 99, "upperArm": 33, "thigh": 57 }
  }
]
```

Tape measurements should be taken at the same anatomical levels the pipeline
uses: chest at the fullest part of the ribcage below the armpit, waist at the
natural narrowest point, hips at the fullest part of the seat, upper arm at
mid-biceps, thigh just below the crotch.

Until this has been run against real subjects, the project has **no** evidence
of real-world accuracy, and nothing in the product should claim any.
