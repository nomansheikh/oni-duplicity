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

# end-to-end tests in Chromium (builds the app and serves it on port 5179)
vp -C apps/web exec playwright install chromium   # once
vp -C apps/web run e2e
```

If the bundled browser can't be downloaded, set `PLAYWRIGHT_CHROMIUM_PATH` to a local Chromium or Chrome.

The bionic duplicant test needs the 40 MB `mithro-06` save from the full fixture tier. It is skipped unless that save is downloaded, and runs only on full-tier CI (`main` and nightly); there it fails if the save is missing.

The pre-commit hook runs `vp check --fix` on staged files.

## Making a change

- Keep PRs focused on one thing.
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org) (`feat(web): …`, `fix(parser): …`); a check enforces it, and the title becomes the squash commit and the changelog entry.
- Code style is whatever `vp check --fix` produces: no semicolons, single quotes.
- Parser changes must keep the round-trip test passing on every fixture (the last command above).
- New editors go through `worker/model.ts`: add a view model, an `Edit` variant and its `applyEdit` case, and make sure undo restores it.
- Every mutating feature gets an end-to-end test in `apps/web/e2e`: edit through the UI, download, and use `expectOnlyChanged` to assert the save changed exactly where intended.

## Game data

`packages/game-data/src/generated/game-data.json` is generated. After a game update, run `vp run extract-game-data` with the game installed (set `ONI_PATH` if it isn't in the default Steam folder) and commit the result. Never commit decompiled game code or Klei art.

## Releases

release-please keeps a release PR open on `main`. Merging it tags a release, which deploys the app to GitHub Pages.

## Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
