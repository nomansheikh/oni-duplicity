# Duplicity

A browser-based save editor for [Oxygen Not Included](https://www.klei.com/games/oxygen-not-included), covering the base game and every DLC.

It is a from-scratch successor to [RoboPhred/oni-duplicity](https://github.com/RoboPhred/oni-duplicity), which is no longer maintained.

> **Status:** early development. Back up your save before replacing it with an edited one.

## Features

- Load any save from 7.31 to 7.38, base game or any DLC. Newer saves load with a warning.
- **Overview:** colony name, sandbox mode, cycles, cluster, DLCs.
- **Duplicants** (including bionic): name, traits, attribute levels, mastered skills.
- **Geysers, vents and volcanoes:** output, eruption and dormancy stats; rename.
- Download the edited save. Unchanged data is written back byte for byte.

## Privacy

Your save file never leaves your browser. Parsing and editing run locally, and there is no server or analytics.

## Development

Requires the [Vite+](https://viteplus.dev) CLI (`vp`).

```bash
vp install   # install dependencies
vp dev       # start the web app
vp check     # format, lint and type-check
vp test      # run tests
vp build     # build the web app
```

## License

[MIT](LICENSE).

Oxygen Not Included is a trademark of Klei Entertainment. This project is not affiliated with or endorsed by Klei Entertainment.
