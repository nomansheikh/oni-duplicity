# Open questions

Each row is resolved in the phase shown, and the answer moves into [architecture.md](architecture.md) or `save-format.md`.

| #   | Question                                                                                                                     | Resolve in       | Current assumption                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| 1   | Can `oni-save-parser@14.0.1` parse 7.35–7.38 saves? If not, is konove's fork (updated 2026-09) a usable differential oracle? | Phase 1          | Use whichever parses the most fixtures; document the gaps.                            |
| 2   | How does oni-save-parser represent 64-bit integers, and do any templates hold values beyond 2^53?                            | Phase 1          | Match its representation so the JSON comparison stays exact.                          |
| 3   | How large is the decompressed body of the 40 MB fixture, and does eager decoding fit the 5 s / memory budget?                | Phase 3, day one | Eager decoding; switch hot paths to lazy only if measurements require it.             |
| 4   | `fflate` or `pako` 2?                                                                                                        | Phase 3          | Benchmark both on every fixture.                                                      |
| 5   | Which `Db` registries differ between base-game and Spaced Out mode?                                                          | Phase 4          | Dump both modes and merge.                                                            |
| 6   | Do accessories (hair, heads, body parts) have display names in `strings_template.pot`, or only IDs?                          | Phase 4          | Fall back to formatted IDs where no string exists.                                    |
| 7   | Should game-data include localized names from Klei's shipped `ko`/`ru`/`zh` translations?                                    | Phase 4          | English only at first; `nameKey` keeps the option open.                               |
| 8   | Does `shadcn init` detect a Vite+ project?                                                                                   | Phase 5          | Write `components.json` by hand if not.                                               |
| 9   | Which critter fields (age, wildness, domestication) are present in 7.38 behaviors?                                           | Phase 7          | Show only what the save contains.                                                     |
| 10  | Which space and research edits are safe (starmap, POIs, techs)?                                                              | Phase 7          | Read-only until verified in-game.                                                     |
| 11  | Saves with mod content: which behaviors appear, and do they round-trip?                                                      | Phase 3          | Generic behaviors round-trip; editing mod data is out of scope beyond the raw editor. |
| 12  | When to post the courtesy issue on RoboPhred/oni-duplicity announcing the successor?                                         | v0.1             | Draft ready at v0.1; the owner posts it.                                              |
