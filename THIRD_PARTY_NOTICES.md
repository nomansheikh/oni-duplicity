# Third-party notices

Duplicity's own code is [MIT](LICENSE). It includes or ships the following.

## Game content

Oxygen Not Included, its names, descriptions and art are the property of Klei Entertainment. Duplicity is not affiliated with or endorsed by Klei.

- **Duplicant portraits** are drawn from the sprite sheets and layout data in [react-oni-duplicant](https://www.npmjs.com/package/react-oni-duplicant) 0.1.3 (ISC, William Matthews), which the build bundles. The sprites are Klei's art; none are committed to this repository.
- **Game data** (`packages/game-data/src/generated/game-data.json`) holds IDs, English names and descriptions extracted from a local game install.

## Code

- **Skill list** in `packages/game-data/src/skills.ts`, from [konove/oni-save-parser](https://github.com/konove/oni-save-parser). MIT, Copyright (c) 2018 RoboPhred. Full text: [test-data/licenses/konove-oni-save-parser-LICENSE](test-data/licenses/konove-oni-save-parser-LICENSE).

## Bundled packages

| Package                                           | License    |
| ------------------------------------------------- | ---------- |
| react, react-dom                                  | MIT        |
| radix-ui                                          | MIT        |
| cmdk                                              | MIT        |
| sonner                                            | MIT        |
| next-themes                                       | MIT        |
| @tanstack/react-virtual                           | MIT        |
| cn, tw-animate-css                                | MIT        |
| class-variance-authority                          | Apache-2.0 |
| comlink                                           | Apache-2.0 |
| lucide-react                                      | ISC        |
| react-oni-duplicant                               | ISC        |
| fflate                                            | MIT        |
| Barlow, Chakra Petch, JetBrains Mono (Fontsource) | OFL-1.1    |

Each package's full license ships in its npm package.

## Test saves

Listed with their sources and licenses in [test-data/README.md](test-data/README.md) and [test-data/fixtures.json](test-data/fixtures.json):

- the owner's saves, CC0-1.0;
- a save from [konove/oni-save-parser](https://github.com/konove/oni-save-parser), MIT;
- six saves from [mithro/python-oni-save-parser](https://github.com/mithro/python-oni-save-parser), Apache-2.0.
