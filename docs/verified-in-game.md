# Verified in game

Edits confirmed by loading the edited save in the real game. Nothing is listed yet, so treat every edit as unverified and keep a backup.

| Feature             | Edit                                                                                                                           | Game version | DLCs | Date | Verified by |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---- | ---- | ----------- |
| Delete loose debris | Delete one, selected and all loose chunks of an element; the game loads, nothing reappears, and no errand or move order breaks |              |      |      |             |

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
