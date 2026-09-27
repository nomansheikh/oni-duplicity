# Test data

Save files used by the parser and app tests. [`fixtures.json`](fixtures.json) is the source of truth for file names, SHA-256 checksums, save versions, DLCs and licenses.

## Getting the fixtures

```bash
vp run fixtures               # everything (about 120 MB of downloads)
vp run fixtures --tier small  # the set CI runs on pull requests (about 5 MB)
```

Three saves are committed in `saves/`. The rest are downloaded from the [`fixtures-v1` release](https://github.com/nomansheikh/oni-duplicity/releases/tag/fixtures-v1) into `fetched/` (git-ignored) and checked against their SHA-256. A local file with the wrong checksum is downloaded again; a download with the wrong checksum is rejected. Committed saves are never downloaded or overwritten; a checksum mismatch there fails the command and the tests.

## Fixtures

| File                                             | Tier  | Version | DLCs                                   | Cycles | Duplicants | License    |
| ------------------------------------------------ | ----- | ------- | -------------------------------------- | ------ | ---------- | ---------- |
| `saves/apple-park.sav`                           | small | 7.37    | EXPANSION1, DLC2, DLC3, DLC4, DLC5     | 0      | 3          | CC0-1.0    |
| `saves/beautiful-galaxy-build-744825.sav`        | small | 7.38    | EXPANSION1, DLC2, DLC3, DLC4, DLC5     | 89     | 9          | CC0-1.0    |
| `saves/beautiful-galaxy.sav`                     | small | 7.38    | EXPANSION1, DLC2, DLC3, DLC4, DLC5     | 88     | 9          | CC0-1.0    |
| `fetched/konove-save-game.sav`                   | small | 7.36    | EXPANSION1, DLC2, DLC3, DLC4 (sandbox) | 67     | 8          | MIT        |
| `fetched/mithro-01-early-game-cycle-010.sav`     | small | 7.34    | DLC2                                   | 10     | 5          | Apache-2.0 |
| `fetched/mithro-02-mid-game-cycle-148.sav`       | small | 7.33    | base game                              | 148    | 22         | Apache-2.0 |
| `fetched/mithro-03-late-game-cycle-1160.sav`     | full  | 7.33    | base game                              | 1160   | 31         | Apache-2.0 |
| `fetched/mithro-04-advanced-cycle-1434.sav`      | full  | 7.33    | EXPANSION1                             | 1434   | 1          | Apache-2.0 |
| `fetched/mithro-05-most-dupes-59-cycle-1423.sav` | full  | 7.33    | EXPANSION1                             | 1423   | 59         | Apache-2.0 |
| `fetched/mithro-06-maximum-cycle-4770.sav`       | full  | 7.35    | DLC2, DLC3 (bionic duplicants)         | 4770   | 16         | Apache-2.0 |

## Sources and licenses

- `apple-park.sav`, `beautiful-galaxy.sav` and `beautiful-galaxy-build-744825.sav` (the same colony one cycle later, saved by game build 744825): contributed by the project owner under [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- `konove-save-game.sav`: from [konove/oni-save-parser](https://github.com/konove/oni-save-parser), originally from [RoboPhred/oni-duplicity](https://github.com/RoboPhred/oni-duplicity). MIT; see [`licenses/konove-oni-save-parser-LICENSE`](licenses/konove-oni-save-parser-LICENSE).
- `mithro-*.sav`: from [mithro/python-oni-save-parser](https://github.com/mithro/python-oni-save-parser). Apache-2.0; see [`licenses/mithro-python-oni-save-parser-LICENSE`](licenses/mithro-python-oni-save-parser-LICENSE).

Upstream URLs are pinned to commits in `fixtures.json`.

## Adding or changing fixtures

Release assets are never replaced, so older commits keep working. To add or change a fetched fixture, publish a new release (`fixtures-v2`) with every asset, update `baseUrl` and the entries in `fixtures.json`, and update the table above. To contribute a save, open a "Contribute a test save" issue.
