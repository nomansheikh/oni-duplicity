# Verified in game

Edits confirmed by loading the edited save in the real game. Nothing is listed yet, so treat every edit as unverified and keep a backup.

| Feature             | Edit                                                                                                                           | Game version | DLCs | Date | Verified by |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---- | ---- | ----------- |
| Delete loose debris | Delete one, selected and all loose chunks of an element; the game loads, nothing reappears, and no errand or move order breaks |              |      |      |             |

## Waiting to be checked

Edits that are built but not yet loaded in the real game. Tick one, and move it to the table above, only after following the steps on an unmodded save.

- [ ] **Change a geyser's type (experimental).** Use a save without the Geyser Control mod, with a Cool Steam Vent that is not buried.
  1. Note the vent's position, then open its info panel and write down its output per second, temperature (`110 °C`), eruption and activity cycles, and name.
  2. In Duplicity, open Geysers, edit that vent, change its type to Steam Vent and download the save.
  3. Load the downloaded save. The game should load without a missing-prefab warning and with the vent in the same place and size.
  4. Check that the vent now reads Steam Vent, keeps its generated suffix (for example `24‑3`), emits steam at 500 °C, and that its output per cycle sits in the Steam Vent range (500 to 1000 kg).
  5. Let it erupt through one cycle, then save and reload once more to see that nothing reverts.
  6. Repeat with one swap that the game itself had to rebuild: a Polluted Water Vent to a Salt Water Geyser (its germs should be gone) and a Carbon Dioxide Geyser to a Cool Slush Geyser (the geyser's own temperature drops from -55 °C to -10 °C).
- [ ] **Demolior impact cycle** (DLC page, experimental). Edit a Spaced Out save with `DLC4_ID`, postpone the impact by 50 cycles, load it, and check that the impactor's timer on the clusters map and the notification clock show the new time, that it still arrives and lands, and that it can still be shot down. Also check the impact cycle when advancing it to a few cycles from now. The edit rewrites `eventStartTime` plus the impactor's saved `ArrivalTime` and `Speed`.

## Not yet checked in game

Each step starts from a save you can lose. Keep the original beside it.

- [ ] Space page, points of interest (Spaced Out, one 7.33 and one 7.38 save): type, location, stock, recharge, artifact state and revealed state match the starmap and the POI side screens in game.
- [ ] POI stock refill (experimental), Spaced Out:
  1. In the editor, open Space and note a POI whose stock is below full, then press Fill on its row and download the save.
  2. Load it, open the starmap and select that POI.
  3. Expect the side screen to show the full stock, no error on load, and the stock staying full after one more cycle.
  4. Repeat with a typed value (for example 1000 kg): expect 1000 kg, rising by about the daily recharge each cycle until full.
- [ ] Reveal known cells, Spaced Out:
  1. In Space, press "Reveal known cells" and download.
  2. Load it and open the starmap.
  3. Expect every cell that was at least peeked before to be fully shown. Cells that were never seen stay hidden.
- [ ] Destination recoverable mass, base game (for example a 7.33 mid-game save):
  1. In Space, set a destination's mass to 5000 kg (or press Fill) and download.
  2. Load it, open the starmap and select that destination.
  3. Expect the recoverable mass to match, and to grow back toward full over the following cycles.
- [ ] Destination analysis, base game:
  1. Pick a destination shown as Hidden, press Discover, download and load it. Expect it to appear on the starmap as a discovered but unanalyzed destination.
  2. Press Analyze on a hidden or discovered destination, download and load it. Expect it fully analyzed, with its resources and research options visible, and no scan still running on it.
- [ ] Spawn resources at the printing pod (experimental):
  1. In Resources, open an element the colony holds only in storage (for example Steel), spawn 250,000 kg at 25 °C and download. Expect three loose chunks of about 83.3 t.
  2. Load it. Expect no load warning, three Steel debris piles on the printing pod's floor at 25 °C, and that duplicants can sweep and store them.
  3. Repeat with a liquid the colony has (for example Water, 500 kg): expect a loose bottle at the pod that can be mopped or emptied.
  4. Save and reload once more to see that the chunks keep their mass and temperature.
