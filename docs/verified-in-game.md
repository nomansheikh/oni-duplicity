# Verified in game

Edits confirmed by loading the edited save in the real game. Nothing is listed yet, so treat every edit as unverified and keep a backup.

| Feature | Edit | Game version | DLCs | Date | Verified by |
| ------- | ---- | ------------ | ---- | ---- | ----------- |

## Waiting to be checked

Edits that are built but not yet loaded in the real game. Tick one, and move it to the table above, only after following the steps on an unmodded save.

- [ ] **Change a geyser's type (experimental).** Use a save without the Geyser Control mod, with a Cool Steam Vent that is not buried.
  1. Note the vent's position, then open its info panel and write down its output per second, temperature (`110 °C`), eruption and activity cycles, and name.
  2. In Duplicity, open Geysers, edit that vent, change its type to Steam Vent and download the save.
  3. Load the downloaded save. The game should load without a missing-prefab warning and with the vent in the same place and size.
  4. Check that the vent now reads Steam Vent, keeps its generated suffix (for example `24‑3`), emits steam at 500 °C, and that its output per cycle sits in the Steam Vent range (500 to 1000 kg).
  5. Let it erupt through one cycle, then save and reload once more to see that nothing reverts.
  6. Repeat with one swap that the game itself had to rebuild: a Polluted Water Vent to a Salt Water Geyser (its germs should be gone) and a Carbon Dioxide Geyser to a Cool Slush Geyser (the geyser's own temperature drops from -55 °C to -10 °C).
