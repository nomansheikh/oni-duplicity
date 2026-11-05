# Verified in game

Edits confirmed by loading the edited save in the real game. Nothing is listed yet, so treat every edit as unverified and keep a backup.

| Feature             | Edit                                                                                                                           | Game version | DLCs | Date | Verified by |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---- | ---- | ----------- |
| Delete loose debris | Delete one, selected and all loose chunks of an element; the game loads, nothing reappears, and no errand or move order breaks |              |      |      |             |

## Pending checks

Edits shipped but not yet loaded in the game. Move a row into the table above once it is verified.

- [ ] **Demolior impact cycle** (DLC page, experimental). Edit a Spaced Out save with `DLC4_ID`, postpone the impact by 50 cycles, load it, and check that the impactor's timer on the clusters map and the notification clock show the new time, that it still arrives and lands, and that it can still be shot down. Also check the impact cycle when advancing it to a few cycles from now. The edit rewrites `eventStartTime` plus the impactor's saved `ArrivalTime` and `Speed`.
