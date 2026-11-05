# Save format notes

Notes on the save format that the parser's code and tests do not already say. This file is not a full format specification.

## Differences from oni-save-parser

`vp run differential` parses every fixture with [konove's fork of oni-save-parser](https://github.com/konove/oni-save-parser) (commit `3bb6076`, `versionStrictness: "major"`) and with our `parseSave`, then compares the values. It does not compare bytes or length prefixes, because the two parsers write collection lengths differently and neither re-reads the other's output.

All ten fixtures (7.33–7.38) match on every value. The only differences are the intentional ones below, which the script counts but does not fail on. Anything else fails with the path and both values.

The fork is built from source into `.cache/oracle/<sha>` rather than installed as a dev dependency. The upstream npm package (`oni-save-parser@14.0.1`) crashes on Node 24, and the fork lists minors 28, 31, 32, 34, 36 and 38 but also parses 33, 35 and 37 identically under `"major"`.

| Difference                                 | Ours                   | Why it is safe                                                                                                              |
| ------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 64-bit integers                            | `bigint`               | The oracle uses `{ unsigned, lower, upper }`; the comparison converts it to `bigint` and requires exact equality.           |
| `simData` and other buffers                | `Uint8Array`           | The oracle returns `ArrayBuffer`; the bytes are compared.                                                                   |
| Colours (e.g. `PixelPack` `colorSettings`) | Bytes 0–255            | The oracle stores 0–1 floats; each channel must equal `round(float × 255)` exactly.                                         |
| `StateMachineController` extra data        | Raw bytes (`extraRaw`) | Only the oracle decodes it. The decoded form is re-encoded and must equal our raw bytes, so nothing is lost on either side. |
| `Klei.AI.Modifiers` list name              | `sicknesses`           | The oracle calls the same list `diseases`.                                                                                  |

## Known oracle defect: sickness lists on `Klei.AI.Modifiers`

The oracle reads the second list of `Klei.AI.Modifiers` (critters and other non-duplicant creatures) using the template `Klei.AI.DiseaseInstance`. Saves contain `Klei.AI.SicknessInstance` and no `DiseaseInstance` template. Our parser uses `SicknessInstance`. The oracle's `MinionModifiers` parser uses `SicknessInstance` correctly.

The oracle only looks up the template when the list has items. No fixture has a non-empty list on a `Klei.AI.Modifiers`, so the oracle works on all of them, and a save with one would very likely make it throw on the missing template; that path is untested. Non-empty sickness lists do occur on `MinionModifiers` (two duplicants in `mithro-02`, `SlimeSickness`), and both parsers agree on those.

## Coverage of the differential test

- Fixtures cover save versions 7.33–7.38 only. Nothing covers 7.28–7.32.
- Sickness items on `Klei.AI.Modifiers` are never exercised; on `MinionModifiers` only two items (both `SlimeSickness`) are.
- It proves agreement with another parser, not with the game. Nothing is verified in the game yet.
