# Contributing

Thanks for helping. Bug reports with a save file attached are the most useful thing you can send.

## Reporting a bug

Open an issue with the **Bug report** form. Include the game version, your DLCs, what you edited and what happened. If you can share the save, attach it (zip it first; GitHub doesn't accept `.sav`). Saves are only used to reproduce the bug.

## Setting up

Install the [Vite+](https://viteplus.dev) CLI, then:

```bash
vp install
vp dev          # the app at http://localhost:5173
vp check        # format, lint, type-check
vp run fixtures # download the small tier of test saves
vp test         # tests; saves that aren't downloaded are skipped

# every test save (about 120 MB) and the slow round trips
vp run fixtures --tier all && FIXTURE_TIER=all vp test

# only named saves (checksums still verified), e.g. for the benchmark
vp run fixtures --file mithro-03-late-game-cycle-1160.sav

# parser benchmark and regression gate (needs the full tier)
vp run bench            # compare against test-data/bench-baseline.json
vp run bench --update   # re-record the baseline after an intended change
```

`vp run bench` takes about two minutes. Run it on a quiet machine: other busy processes make the timings, and so the comparison, unreliable.

The parser fuzz tests (`packages/save-parser/tests/fuzz`) run in `vp test` with about 500 cases. Tune them with `FUZZ_SCALE` (case-count multiplier, e.g. `FUZZ_SCALE=20`), `FUZZ_SEED`, `FUZZ_DEADLINE_MS` and `FUZZ_ONLY=<category>#<n>` to replay one case (with the same `FUZZ_SEED`; it ignores `FUZZ_SCALE`, and an unknown name fails). A failure prints its seed and mutation.

The pre-commit hook runs `vp check --fix` on staged files.

## Making a change

- Keep PRs focused on one thing.
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org) (`feat(web): …`, `fix(parser): …`); a check enforces it, and the title becomes the squash commit and the changelog entry.
- Code style is whatever `vp check --fix` produces: no semicolons, single quotes.
- Parser changes must keep the round-trip test passing on every fixture (the last command above).
- New editors go through `worker/model.ts`: add a view model, an `Edit` variant and its `applyEdit` case, and make sure undo restores it.

## Game data

`packages/game-data/src/generated/game-data.json` is generated. After a game update, run `vp run extract-game-data` with the game installed (set `ONI_PATH` if it isn't in the default Steam folder) and commit the result. Never commit decompiled game code or Klei art.

## Releases

release-please keeps a release PR open on `main`. Merging it tags a release, which deploys the app to GitHub Pages.

## Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
