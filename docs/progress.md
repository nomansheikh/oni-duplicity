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

## Parser fuzz tests — 2026-11-05

- `packages/save-parser/tests/fuzz` mutates `apple-park.sav` with a seeded PRNG and requires every case to end in a `ParseError`, or in a parse that writes back, re-parses its own output and writes the same bytes again. A `ParseError` from the writer or from re-parsing our own output is a bug, as is anything else (`TypeError`, `RangeError`, a raw zlib error, a hang, out of memory) counts as a bug.
- Seven regions: whole-file truncation, header flips, template flips, compressed-body flips, and, on the decompressed body, truncation, flips in the world and settings data, and flips in the game objects and game data. Body flips mostly avoid opaque payloads such as sim data.
- Cases run in `node:worker_threads` workers with a 5 s deadline; a hung worker is terminated and the case is retried once in a fresh worker before it counts as a hang; a crash or out-of-memory (256 MB old-generation cap, which does not cover typed arrays) also counts as a failure. Failures are grouped by error and print the seed and mutation, and `FUZZ_ONLY` replays one case regardless of scale.
- The default run is about 500 cases in roughly 12 s. At `FUZZ_SCALE=20` (10,000 cases, 3 to 4.5 minutes) one case failed: a flipped type byte in the templates leaves a collection type without its element type, and `readCollection` throws a `TypeError` instead of a `ParseError` (`FUZZ_SEED=big2 FUZZ_ONLY=templates#105`). It is not fixed in this change.
- Fault injection: removing the bounds check in `Reader` produced grouped `RangeError` failures, an infinite loop in the header reader produced a `timeout` failure, and a body that stops re-parsing produced a `reparse` failure, so the harness does detect bugs. All changes were reverted.
- Gaps: one fixture, and no well-formed but hostile inputs such as huge valid counts or lengths.
- Next: the differential test against oni-save-parser.
