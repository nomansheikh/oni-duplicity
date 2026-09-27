# Duplicity

A browser-based save editor for [Oxygen Not Included](https://www.klei.com/games/oxygen-not-included), covering the base game and every DLC.

It is a from-scratch successor to [RoboPhred/oni-duplicity](https://github.com/RoboPhred/oni-duplicity), which is no longer maintained.

**Use it:** [nomansheikh.github.io/oni-duplicity](https://nomansheikh.github.io/oni-duplicity/) (live from the first release).

> **Status:** early development. Always keep a backup of your save before replacing it with an edited one. No edit has been confirmed in the game yet; see [verified in game](docs/verified-in-game.md).

## Features

- **Overview:** colony name, sandbox mode, cycles, stress, cluster and DLCs.
- **Duplicants** (including bionic), each with a portrait:
  - name, gender and appearance (hair, head, eyes and more) with a live preview;
  - traits, interests, attribute levels, skills and experience;
  - health and needs (stress, calories, bladder, stamina, bionic power and oil, and more);
  - effects, with their remaining cycles;
  - copy a whole profile to another duplicant, or export it to a file and import it into another save.
- **Critters:** tame or make wild, set age, fertility and calories, clone or delete.
- **Geysers, vents and volcanoes:** output, eruption and dormancy stats; rename.
- **Materials:** totals per element across debris and storage; set every temperature, multiply every mass, edit or delete single items.
- **Research:** mark techs as researched, or research everything.
- **Space:** rename asteroids and mark them discovered; list starmap destinations.
- **Game settings:** difficulty and custom game settings.
- **Raw data:** browse and edit any value in the save, for everything the editors above don't cover.
- Undo and redo for every edit (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd>).
- Download the edited save. Data you didn't touch is written back byte for byte.

## Supported saves

| Save version    | Status                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| 7.33–7.38       | Supported. Test saves for each version round-trip byte for byte.                      |
| 7.31–7.32       | Supported, but no test save yet.                                                      |
| newer than 7.38 | Opens with a warning. Downloading needs **Allow unverified versions** in Preferences. |
| older than 7.31 | Not supported. Load the save in the current game and save it again.                   |

The test saves cover the base game, Spaced Out!, Frosty Planet, Bionic Booster, Prehistoric Planet and Aquatic Planet.

## How to use

1. Find your save. Each colony has a folder of `.sav` files in:
   - Windows: `Documents\Klei\OxygenNotIncluded\cloud_save_files\<id>\` (or `save_files\` for local saves)
   - macOS: `~/Library/Application Support/unity.Klei.Oxygen Not Included/cloud_save_files/<id>/` (or `save_files/`)
   - Linux: `~/.config/unity3d/Klei/Oxygen Not Included/cloud_save_files/<id>/` (or `save_files/`)
2. Open Duplicity and drop the `.sav` file on the page, or click **Choose a save**.
3. Make your edits, then click **Download save**.
4. Back up the original, replace it with the downloaded file (same file name), and load it in the game.

## Privacy

Your save file never leaves your browser. Parsing and editing run locally in a web worker, and there is no server or analytics.

## Development

Requires the [Vite+](https://viteplus.dev) CLI (`vp`).

```bash
vp install              # install dependencies
vp dev                  # start the web app
vp check                # format, lint and type-check
vp test                 # run tests
vp run fixtures         # download the large test saves (--tier small|all)
vp run -r build         # build the app and pack the libraries
```

The repository has three packages:

- [`packages/save-parser`](packages/save-parser): reads and writes ONI saves.
- [`packages/game-data`](packages/game-data): names and IDs generated from the game's files.
- [`apps/web`](apps/web): the editor.

How it fits together is in [docs/architecture.md](docs/architecture.md). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- [RoboPhred](https://github.com/RoboPhred) for the original Duplicity and [oni-save-parser](https://github.com/RoboPhred/oni-save-parser), which mapped out the save format.
- [react-oni-duplicant](https://www.npmjs.com/package/react-oni-duplicant) for the duplicant portrait sprites and layout data.
- [konove](https://github.com/konove) for keeping a fork of both up to date with recent game versions.

Third-party code and assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE).

Oxygen Not Included is a trademark of Klei Entertainment. Duplicant portrait art belongs to Klei Entertainment. This project is not affiliated with or endorsed by Klei Entertainment.
