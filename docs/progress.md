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

## Parser benchmark and regression gate — 2026-11-05

- `vp run bench` times read + inflate, parse body, write body and deflate for the 40 MB and 13 MB saves (one warm-up, median of five, each save in its own process) and prints a table with peak RSS. It skips with a message when the saves are not downloaded.
- The regression gate compares each phase's time divided by a fixed CPU calibration workload against `test-data/bench-baseline.json`, keyed per `<platform>-<arch>`, and fails above +30%. A phase that looks regressed is measured again and fails only if it regresses twice. `vp run bench --update` rewrites the baseline for the current platform. CI runs `vp run bench --require` when `FIXTURE_TIER` is `all`.
- Measured on an Apple M2 Max, 12 cores, 32 GB, Node 26.13.0, quiet machine (median, 40 MB save): read + inflate 1.5 s, parse body 1.6 s, write body 2.8 s, deflate 4.0 s with `fflate`; peak RSS 4.1 GB. The 13 MB save: 0.44 s, 0.42 s, 0.58 s, 1.1 s; peak RSS 1.3 GB.
- Parse meets the 5 s target. **Saving does not:** write body plus deflate is about 6.9 s with `fflate`, over 5 s. The browser's native `CompressionStream` was measured at about 7 s for this save above, so it does not close the gap. Whether the target covers compression is open question #14; the assumption is "not met".
- Next: commit the `linux-x64` baseline from the first `main` run (until then CI prints the JSON and passes), and decide how to reach the save target.
- Risks: the calibration only partly tracks the parser, so the first Linux baseline may need a wider threshold. A noisy machine can still fail twice in a row. A slowdown that also slows the calibration is invisible. Peak RSS of 4.1 GB is a real constraint for browser tabs.
