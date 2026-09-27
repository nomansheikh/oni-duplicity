# Requirements

What Duplicity must do, and how we know it does it. Design decisions live in [architecture.md](architecture.md); unresolved items in [open-questions.md](open-questions.md).

## Scope

- Save format major 7, minors 31–38, with every DLC: `EXPANSION1_ID` (Spaced Out), `DLC2_ID`, `DLC3_ID` (bionic duplicants), `DLC4_ID`, `DLC5_ID`.
- Runs entirely in the browser. Saves never leave the user's machine.
- English is complete. The old Duplicity cs/es/ru/zh translations are a starting reference for new keys.

## Features

Every mutating feature needs a unit test on its model, a fixture test (edit → write → re-parse shows the intended change and nothing else), a Playwright e2e, and an entry in [verified-in-game.md](verified-in-game.md) once checked in the real game.

1. **Load / save**
   - Drag and drop, file picker, progress bar, version and DLC badges.
   - Friendly errors with a details section.
   - Autosave detection.
   - Pre-save diff summary ("3 duplicants changed, 1 geyser changed"), a "back up your save first" warning, and download as `<baseName>.sav`.
   - Undo/redo and a modified indicator.
2. **Overview**
   - Colony name (editable `baseName`), cycles, duplicant count, cluster, DLCs.
   - Difficulty and every current custom game setting, including Bionic Wattage and Demolior Impact.
   - Sandbox toggle, without the old "GameObject 0 has no id" failure.
3. **Duplicants**, including bionic duplicants
   - List/grid with traits, interests and attributes; search and sort.
   - Editor: name; traits (filtered by DLC, with exclusion rules and positive/negative badges); interests; attributes (no fake caps); skills and XP (including Rocketry, Bionic and Swimming where the DLC is present); effects (add/remove, durations in cycles); health and amounts with real per-duplicant maximums; appearance (hair, head, eyes, mouth, body parts); clone, copy/paste, export/import JSON.
   - Bionic: boosters (install/remove), power banks and charge, gear oil, gunk, oxygen tank.
4. **Critters**: list by species/morph with position, age, and domestication/wildness where available; clone and delete.
5. **Geysers, vents and volcanoes**: all current types; edit the rolls with computed stats (output rate, active/dormant periods); change type; rename (7.31+).
6. **Materials and storage**: totals per element (loose and stored) with filter and search; edit mass and temperature of debris and storage contents; delete loose debris.
7. **Space**: base game starmap destinations; Spaced Out asteroids/worlds and POIs where safely editable.
8. **Research**: mark techs researched, if it can be done safely.
9. **Raw editor**: virtualized tree, search by path/key, edit primitives, add/remove array items, copy the JSON path.
10. **Settings**: language, theme, "allow unverified versions".
11. **Stretch**, only after everything above is solid: decode the sim data for a map view and tile editing (element, mass, temperature), using ONI Save Lab as a reference for the grid layout.

## Parser acceptance

- **Round trip:** for every fixture, `writeSave(parseSave(x))` reproduces the header and the decompressed body byte for byte.
- **Differential:** every fixture parses to the same JSON as oni-save-parser (dev dependency, `versionStrictness: "major"`). Every intentional difference is listed and explained in `save-format.md`.
- **Performance** on a normal laptop: the 40 MB fixture parses in under 5 s and writes in under 5 s. Peak memory is documented. `vp run bench` exists, and CI fails on a regression over 30%.
- **Robustness:** truncated or corrupted files fail with a `ParseError`, never hang or crash. Fuzz tests prove it.
- Unit tests for every primitive type, template type code and extra-data parser.

## App acceptance

- Every feature above has unit tests plus a Playwright e2e: load fixture → edit → save → re-parse → assert the change.
- `vp check`, `vp test`, `vp build` and `vp pack` are clean, and CI runs them on every push and PR.
- The main bundle stays small; the parser and game data load in the worker or lazily.

## Fixtures

| Source                                     | File                              | Size   | Version | DLCs                               |
| ------------------------------------------ | --------------------------------- | ------ | ------- | ---------------------------------- |
| konove/oni-save-parser (MIT)               | `test-data/save-game.sav`         | 2.1 MB | 7.36    | EXPANSION1, DLC2, DLC3, DLC4       |
| mithro/python-oni-save-parser (Apache-2.0) | `01-early-game-cycle-010.sav`     | 0.8 MB | 7.34    | DLC2                               |
| ″                                          | `02-mid-game-cycle-148.sav`       | 2.3 MB | 7.33    | base                               |
| ″                                          | `03-late-game-cycle-1160.sav`     | 13 MB  | 7.33    | base                               |
| ″                                          | `04-advanced-cycle-1434.sav`      | 31 MB  | 7.33    | Spaced Out                         |
| ″                                          | `05-most-dupes-59-cycle-1423.sav` | 31 MB  | 7.33    | Spaced Out, 59 duplicants          |
| ″                                          | `06-maximum-cycle-4770.sav`       | 40 MB  | 7.35    | DLC2, DLC3 (has `BionicMinion`)    |
| Project owner                              | `Apple Park.sav`                  | 1.2 MB | 7.37    | EXPANSION1, DLC2, DLC3, DLC4, DLC5 |
| Project owner                              | `Beautiful Galaxy.sav`            | 2.2 MB | 7.38    | EXPANSION1, DLC2, DLC3, DLC4, DLC5 |
