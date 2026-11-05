# Progress

## Toolchain gate — 2026-09-27

`vp install`, `vp check`, `vp test`, `vp build` and `vp pack` all pass on the empty scaffold.

```
$ vp toolchain
Vite+ toolchain (local)

vite-plus@1.0.0-rc.1
├── depends on @voidzero-dev/vite-plus-core@1.0.0-rc.1
│   ├── bundles vite@8.3.1
│   │   └── uses rolldown@1.2.11
│   │       ├── compiles oxc@0.151.0
│   │       └── compiles oxc-resolver@11.24.3
│   ├── bundles rolldown@1.2.11
│   │   ├── compiles oxc@0.151.0
│   │   └── compiles oxc-resolver@11.24.3
│   └── bundles tsdown@0.23.0
├── depends on vitest@5.0.1
├── depends on oxlint@1.85.0
├── depends on oxlint-tsgolint@7.0.2003
├── depends on oxfmt@0.70.0
└── compiles vite-task (built 2026-09-26T05:51:50Z, revision 7d69d6577ecf6bd83deee32186de59918a712873)
```

Node 24.21.0, pnpm 12.6.0, TypeScript 7.0.2.

### Scaffold notes

- Created with `vp create vite:monorepo`, `vp create vite:library` (×2) and `vp create vite -- web --template react-ts`. `--directory` only works with built-in templates; `create-vite` takes the name as a positional and `vp create` places it under `apps/` itself.
- The `vite:library` template in rc.1 writes `pack.dts: { tsgo: true }`, which fails type-checking against tsdown 0.23 (`dts.tsgo` is now an options object, and tsgo is picked automatically for TypeScript 7). Replaced with `dts: true`.
- `defaultPackage` in the root `vite.config.ts` only applies to bare commands. `vp dev --port 5173` bypasses it and serves the workspace root (404); use `vp dev` or `vp -C apps/web dev --port …`.
- The root must declare `@types/node` from the catalog. Without it the root resolves the latest `@types/node` and pnpm installs a second peer variant of `vite-plus`.
- The app's lint block moved to `lint.overrides` in the root config, and its `vite.config.ts` imports `defineConfig` from `vite-plus`.

## Parser and editor — 2026-09-27

- Every fixture (7.33–7.38, base game and all DLCs) round-trips its decompressed body byte for byte, including the 451 MB body of the largest save.
- The 40 MB save parses in about 2.4 s in Node and loads in about 6 s in Chrome. Saving it takes about 7 s with the native `CompressionStream` versus 28 s with `fflate`.
- Checked by hand in Chrome: edit → download → reload for duplicants, critters (clone, tame), materials, research, game settings, asteroids and raw edits; undo and redo after each.
- A production build served from `/oni-duplicity/` loads saves and portraits. Lazy-loading the pages cut the main chunk from 688 kB to 399 kB (122 kB gzipped).
- Nothing is verified in the game yet.

## Differential test against oni-save-parser — 2026-11-05

- `vp run differential` compares every fixture with konove's oni-save-parser (`3bb6076`, built from source into `.cache/oracle`, not a dependency) on Node 24: 0 real disagreements across all 10 fixtures (7.33–7.38). Differences and the oracle's `Klei.AI.Modifiers` `DiseaseInstance` defect are in [save-format.md](save-format.md); open question 1 is resolved.
- Each fixture runs in its own child process (oracle peak memory up to 3.7 GB on the largest save; capped at 6 GB).
- Time on this machine, oracle / ours: apple-park 0.2 / 0.06 s; beautiful-galaxy ×2 1.1 / 0.2 s; konove-save-game 1.1 / 0.2 s; mithro-01 0.2 / 0.06 s; mithro-02 1.2 / 0.2 s; mithro-03 7.8 / 1.2 s; mithro-04 16.6 / 2.7 s; mithro-05 16.8 / 2.7 s; mithro-06 27.8 / 4.1 s.
- Whole run: small tier about 8 s warm and 12 s with a cold oracle build (about 4 s); all tiers 97 s.
- CI: the step runs after the tests, with the same tier as the fixtures, and caches `.cache/oracle` by the hash of `scripts/differential/oracle.ts`.
- Gaps: no fixture has a non-empty sickness list on `Klei.AI.Modifiers` (and only two on `MinionModifiers`); 7.28–7.32 are not covered; the oracle cannot confirm anything against the game.
- A unit test (`scripts/differential/compare.test.ts`) checks that normalized equal values pass and tampered values fail, using synthetic objects.
