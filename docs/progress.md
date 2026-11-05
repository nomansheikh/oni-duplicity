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
- The gate compares each phase's time divided by a memory-bound calibration workload (256 MB buffer stream plus many small allocations, sampled after every pass) against `test-data/bench-baseline.json`, keyed per `<platform>-<arch>`, and fails above +30%. A phase that looks regressed is measured again and fails only if it regresses twice. Stale sizes, zero or non-finite baseline times, a worker timeout or kill, and a missing platform baseline under `--require` are errors. `vp run bench --update` rewrites the baseline for the current platform.
- CI runs `vp run bench --require` on pushes to `main`, nightly, on manifest changes, and on PRs touching the parser or the bench (about 2.7 minutes, fetching just the two saves). Dispatching the CI workflow with `bench_baseline` records a baseline on the runner and uploads it as an artifact; the `linux-x64` baseline was recorded that way.
- Measured, 40 MB save, median: Apple M2 Max (12 cores, 32 GB, Node 26.13.0, quiet machine) read + inflate 1.6 s, parse 1.6 s, write 2.7 s, deflate 4.0 s, peak RSS 3.3 to 4.1 GB. GitHub runner (4-core AMD EPYC, 16 GB, Node 24.22.2): 1.7 s, 3.3 s, 6.6 s, 5.8 s, peak RSS 2.6 GB. The 13 MB save: Mac 0.44, 0.43, 0.59, 1.1 s; runner 0.49, 0.88, 1.5, 1.6 s.
- Spread of the normalized phase times across runs: at most ±5.7% over 5 local runs and ±5.3% over 3 CI runs on two CPU models (raw times: ±4.5% and ±3.5%). Both are far below 30%, so the gate uses the calibrated ratio, which also halved the noise on a loaded Mac (raw ±27 to 42%, normalized ±17 to 21%).
- Parse meets the 5 s target on both machines. **Saving does not:** write body plus deflate is about 6.7 s on the Mac and about 12 s on the runner with `fflate` at level 1. Whether the target covers compression is open question #15; the assumption is "not met".
- The older "28 s with `fflate`" figure above was measured in the browser and is not reproduced here; its settings are not recorded. In Node on the Mac, `fflate` takes 3.7 s at level 1 and 5.1 s at level 6 (the default) for the 40 MB body, so the level alone does not explain 28 s; the gap to the browser is unexplained.
- Next: decide how to meet the save target (see #15), and look at the 2.6 to 4.1 GB peak, since the browser tab limit is the real constraint.
- Risks: the calibration only partly tracks the parser, so a change that slows both is invisible. Runner hardware varies (two EPYC models in three runs, with little effect so far). The Linux baseline reflects 3 runs, so refresh it if the gate flaps. A noisy machine can still fail twice in a row.
