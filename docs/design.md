# Duplicity UI design direction

Status: proposal, second revision. Dark only. Every colour and proportion below was measured from real in-game screenshots; nothing was picked by eye.

Mockups, each with the game screenshot next to it at the same scale and a blend slider:

- [Duplicants (list, editor card, dialog)](https://claude.ai/artifact/YT11RnP97xQbzpLaVKgrAu)
- [Overview (screen, top bar and legend panel, cycle badge)](https://claude.ai/artifact/QL8k3UGD6KqGuMHe1D2TPN)
- [Component gallery (meters, buttons, tabs, inputs, tooltip, table, alerts)](https://claude.ai/artifact/31h5BGhkwmWk6uH5DLw4qi)

Two earlier directions were rejected: a generic "Colony Control Panel" and a "game-native" pass that described the game from memory. This one starts from the screenshots.

## 1. Decisions

- **Dark only.** No light theme and no theme switch. The game has one look; the editor has one look. Remove `next-themes` usage (`main.tsx`, `App.tsx`, `preferences-dialog.tsx`, `ui/sonner.tsx`) and the `:root` light block in PR 0.
- **Flat and square, not "chunky and rounded".** Every panel, tab, button and node measured has radius 0, a 1px near-black outline and no gradients or drop shadows. The earlier proposals were wrong on this.
- **One mauve title bar per panel.** `#7f3d5e` is the game's only strong accent. Everything else is slate.
- **Light roster rows are real.** The game's skills roster uses light grey-violet rows (`#7e7e89`) on a slate panel. We keep that for lists of people and use the darker `well` colours for data tables.
- **Fonts:** Rajdhani (headings) and Noto Sans (body). See section 6.

## 2. References

Collected 2026-11-05. All images are Klei Entertainment's. They were viewed and sampled for comparison only. None are in the repo or in the app. The wiki blocks scripted downloads, so wiki images were opened in the owner's Chrome and sampled in the page with a canvas; Steam images were downloaded and sampled with Python PIL.

| #   | Screen                                                                                                 | Source                                                                                                                  | Used for                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| R1  | Skills screen at 1920x1080: left panel, roster, top tab strip, skill nodes, tooltip                    | [wiki.gg File:Screenshot_Skills_Menu.webp](https://oxygennotincluded.wiki.gg/wiki/File:Screenshot_Skills_Menu.webp)     | Panel, title bar, tabs, roster rows, group headers, nodes, tooltip, meters, scrollbar. Primary reference.      |
| R2  | Duplicant bio card (portrait, Interests, Traits)                                                       | [wiki.gg File:Example_duplicate_bonuses.png](https://oxygennotincluded.wiki.gg/wiki/File:Example_duplicate_bonuses.png) | Side panel with sections, trait polarity colours, heading style.                                               |
| R3  | "Select a Blueprint" printing dialog                                                                   | [wiki.gg File:Printing_selection.png](https://oxygennotincluded.wiki.gg/wiki/File:Printing_selection.png)               | Dialog, card title bars, section layers, buttons, close button.                                                |
| R4  | Schedule editor                                                                                        | [wiki.gg File:Schedule.png](https://oxygennotincluded.wiki.gg/wiki/File:Schedule.png)                                   | Small title bar, paint-tool buttons, schedule block colours.                                                   |
| R5  | HUD at 1280x720: cycle badge, status strip, alert banner, top button row, overlays row, overlay legend | [Steam store, Oxygen Not Included, screenshot 5](https://store.steampowered.com/app/457140/Oxygen_Not_Included/)        | Top bar buttons, legend panel, alert banner, cycle badge. JPEG at 720p, so colours are medians of small areas. |
| R6  | Research tree (export, not a live screen)                                                              | [wiki.gg File:Research-Tree.png](https://oxygennotincluded.wiki.gg/wiki/File:Research-Tree.png)                         | Lane band colours and neutral research card colour.                                                            |
| R7  | HUD with bottom build bar and top tabs (Steam screenshot 7, 1280x720)                                  | [Steam store, Oxygen Not Included](https://store.steampowered.com/app/457140/Oxygen_Not_Included/)                      | Cross-check of the top tab strip and bottom bar. Not sampled.                                                  |

Not found: a vitals table, a consumables table and a resources list. The wiki has no screenshots of them, and the Steam store images are gameplay with little UI. Table styling is therefore derived (see 3 and 8).

## 3. Sampled values

Method: median or mode of a 3x3 to 6x6 pixel patch for flat fills; 1D scans along a line (run-length of colour changes, tolerance 14 to 40 out of 765) for edges and thicknesses. All coordinates are in the full-resolution image.

| Token                | Value                                                                 | Where it was sampled                                                                                          |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ink` (outline)      | `#020103` / `#000000`                                                 | 1px edge around nodes (R1 x=700,y=215), panels, tabs, buttons (R3)                                            |
| `ground`             | `#2a2d39`                                                             | R1 top tab strip background, panel outer rim (`#2a2d3b`, 2px)                                                 |
| `field` (work area)  | `#3c4152` to `#404559`                                                | R1 main area behind nodes                                                                                     |
| `panel`              | `#404559`                                                             | R1 left panel below the roster, R4 body                                                                       |
| `well` (section)     | `#303443`                                                             | R3 Interests and Traits blocks, R2 sections                                                                   |
| `inset` (lowest)     | `#1f222b`                                                             | R3 lower description area, gaps between sections (1px)                                                        |
| `title`              | `#7f3d5e` (R3, R4), `#844464` to `#874566` (R1)                       | Title bars in R1, R3, R4. Use `#7f3d5e` fill, `#874566` 1px top highlight, `#602e47` 2px bottom edge (R1, R4) |
| `tab`                | `#3e4357`                                                             | R1 inactive tab (1px black outline)                                                                           |
| `tab-on`             | `#808bb2`                                                             | R1 active tab (SKILLS), 27px tall at 1080p                                                                    |
| `btn`                | `#4f5261`                                                             | R5 top-bar buttons (Jobs, Consumables)                                                                        |
| `btn-grey`           | `#6a6966`                                                             | R3 Print button, R6 research card body                                                                        |
| `btn-dark`           | `#3e4357`                                                             | R3 Reject All, edit button                                                                                    |
| `row` (roster)       | `#7e7e89`                                                             | R1 roster rows (Amari, Jean)                                                                                  |
| `row-selected`       | `#844464`                                                             | R1 selected row (Pei), same family as the title bar                                                           |
| group header colours | olive `#807c58`, teal `#588074`, green `#608058`                      | R1 roster group headers                                                                                       |
| `node`               | `#575d6f` available, `#373735` unavailable, `#7c3c5c` mauve (learned) | R1 skill nodes, each with a 1px black outline                                                                 |
| `tooltip`            | `#242c3c`                                                             | R1 tooltip body                                                                                               |
| `legend`             | `#474747` body, title `#853b60` to `#8a3f60`                          | R5 overlay legend. Neutral grey, not slate                                                                    |
| research band        | `#3c4052` / `#42475e` alternating                                     | R6 lane backgrounds                                                                                           |
| `fg`                 | `#ffffff`                                                             | Headings, names, buttons                                                                                      |
| `fg-2`               | `#b2b2b2`                                                             | Secondary text (R3 descriptions, Interest values)                                                             |
| `good`               | `#52c079` (trait text), `#80ff80` (numbers), `#5cc844` (check mark)   | R3 positive trait, R1 roster numbers, check                                                                   |
| `bad`                | `#f44a47`                                                             | R3 negative trait                                                                                             |
| `warn`               | `#ffa649`                                                             | R4 work block; also the selection outline colour in R1                                                        |
| `love`               | `#d8547c`                                                             | R1 heart icon                                                                                                 |
| `meter-ok`           | `#4ca44c` fill, `#bc605c` need segments                               | R1 morale meter (segmented, 1px gaps)                                                                         |
| `holo`               | `#3d80c3` base, `#b2e8f4` grid lines                                  | R2 and R3 portrait background                                                                                 |
| overlay swatches     | `#69cde5`, `#4c4cde`, `#b24a89`, `#d03837`                            | R5 legend                                                                                                     |

Not sampled because no screenshot shows them: hover and pressed states for buttons, disabled state, focus ring, data-table row and alt row, scrollbar thumb beyond `#cccccc`. Those are ours (see 5) and are marked as derived.

### Proportions (1920x1080 unless noted)

| Item             | Measured                                                                | Notes                                                                 |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Title bar height | 32px (3.0% of screen height), plus 2px darker edge, plus 2px near-black | R1. R3 card title is 26px in a 1439px wide image, R4 is 23px in 959px |
| Outline          | 1px black on nodes, tabs, buttons, rows                                 | Panel rim is 1px black plus 2px `#2a2d3b`                             |
| Corner radius    | 0 everywhere. Only the cycle badge is a circle                          | R1, R3, R4, R5                                                        |
| Tab height       | about 27px, with 3px gaps between tabs                                  | R1                                                                    |
| Skill node       | about 47px tall, 79px row pitch, 240px gap to the next column           | R1, estimated from the 0.632 scaled capture                           |
| Roster row       | about 36 to 47px, 1px black separators                                  | R1                                                                    |
| Section blocks   | separated by 1px `#1f222b`; inner padding about 10px                    | R3                                                                    |
| Primary button   | 52px tall, 3.6% of image width, text centred                            | R3 Print; Reject All is 40px                                          |
| Left panel width | 434px, 22.6% of screen width                                            | R1                                                                    |
| Body text        | about 14 to 15px at 1080p, estimated from glyph height                  | Not measured exactly                                                  |
| Heading text     | about 21px, all caps, tracking about +0.05em                            | R2 "INTERESTS", "TRAITS"                                              |

Scale rule: author tokens at 1080p pixel sizes. At widths under 1600px apply `font-size: 87.5%` on `html` (the Tailwind `rem` scale follows) rather than shrinking individual components.

## 4. Structure the game uses, mapped to pages

| Game pattern                                                                                         | Seen in                       | Use in the editor                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top tab strip of icon plus caps label; active tab is the light periwinkle                            | R1, R5                        | App navigation (replaces the sidebar). Overview, Duplicants, Critters, Geysers, Materials, Research, Space, Settings, Raw. On phones it scrolls horizontally. |
| Left side panel: mauve title, portrait and stat boxes, then a sortable header strip and grouped rows | R1                            | Duplicants list. Groups are colour-coded headers (colony, handler groups). Header strip is the sort control.                                                  |
| Master-detail with the same panel language on both sides                                             | R1                            | Duplicants editor: card on the left, tabbed content on the right.                                                                                             |
| Section blocks with a caps heading inside a card                                                     | R2, R3                        | Identity, Vitals, Traits, Attributes. Trait names coloured by polarity, effects indented in grey with the attribute in bold.                                  |
| Table screens with sortable headers and segmented meters per cell                                    | (Vitals screen, not captured) | Overview vitals table, Critters, Materials, Geysers. Derived from the roster header strip.                                                                    |
| Overlay legend: grey panel, centred mauve title, swatch plus label rows                              | R5                            | Content (DLC) list, any colour-coded legend (geyser type, element state).                                                                                     |
| Alert banners: red bar with `!`, grey bullet lines below                                             | R5                            | Overview status strip (low health, high stress, edits pending).                                                                                               |
| Modal dialog: centred caps title, square close button, cards, grey primary and dark secondary button | R3                            | Add trait, Add skill, confirmations.                                                                                                                          |
| Tooltip: dark `#242c3c` box with coloured keywords                                                   | R1                            | Hover details (geyser output, trait effects). Gold for keywords, pink for names.                                                                              |
| Collapsible rows and scroll lists with a plain light scrollbar                                       | R1                            | Raw data tree, long rosters.                                                                                                                                  |
| Lane bands: alternating dark and darker rows with cards on them                                      | R6                            | Research page, grouped by branch.                                                                                                                             |
| Paint-tool row plus row-wise editing                                                                 | R4                            | Not used yet. Candidate for a future schedule editor.                                                                                                         |

## 5. Component recipes

Tokens live in `apps/web/src/index.css`. shadcn's variables map onto them so existing components inherit the look; new classes sit on top as Tailwind v4 `@utility` rules.

```css
:root {
  color-scheme: dark;
  --ink: #020103;
  --ground: #2a2d39;
  --field: #3c4152;
  --panel: #404559;
  --well: #303443;
  --inset: #1f222b;
  --title: #7f3d5e;
  --title-hi: #874566;
  --title-lo: #602e47;
  --tab: #3e4357;
  --tab-on: #808bb2;
  --btn: #4f5261;
  --btn-hi: #5f6478;
  --btn-grey: #6a6966;
  --row: #7e7e89;
  --row-hi: #8d8d99;
  --legend: #474747;
  --fg: #ffffff;
  --fg-2: #b2b2b2;
  --fg-3: #8c90a0;
  --good: #52c079;
  --good-hi: #80ff80;
  --bad: #f44a47;
  --warn: #ffa649;
  --gold: #f2c14a;
  --love: #d8547c;
  --meter-ok: #4ca44c;
  --meter-bad: #bc605c;
  --holo: #3d80c3;
  --holo-line: #b2e8f4;
  --radius: 0px;
  --font-heading: 'Rajdhani', 'Arial Narrow', sans-serif;
  --font-sans: 'Noto Sans', system-ui, sans-serif;
}

/* shadcn mapping: components keep working */
:root {
  --background: var(--ground);
  --foreground: var(--fg);
  --card: var(--panel);
  --card-foreground: var(--fg);
  --popover: #242c3c;
  --popover-foreground: var(--fg);
  --primary: var(--btn-grey);
  --primary-foreground: var(--fg);
  --secondary: var(--btn);
  --secondary-foreground: var(--fg);
  --muted: var(--well);
  --muted-foreground: var(--fg-2);
  --accent: var(--tab-on);
  --accent-foreground: var(--fg);
  --destructive: var(--bad);
  --border: var(--ink);
  --input: var(--inset);
  --ring: var(--warn);
  --sidebar: var(--ground);
}

@theme inline {
  --color-ink: var(--ink);
  --color-field: var(--field);
  --color-well: var(--well);
  --color-inset: var(--inset);
  --color-title: var(--title);
  --color-tab: var(--tab);
  --color-tab-on: var(--tab-on);
  --color-row: var(--row);
  --color-legend: var(--legend);
  --color-good: var(--good);
  --color-bad: var(--bad);
  --color-warn: var(--warn);
  --font-heading: var(--font-heading);
}
```

### Panel and title bar

```css
@utility panel {
  background: var(--panel);
  border: 1px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--ground);
}
@utility title-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2rem; /* 32px at 1080p */
  padding-inline: 0.75rem;
  background: var(--title);
  border-bottom: 2px solid var(--title-lo);
  box-shadow: inset 0 1px 0 var(--title-hi);
  font: 700 1.2rem/1 var(--font-heading);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
@utility well {
  background: var(--well);
  border: 1px solid var(--ink);
  padding: 0.625rem 0.75rem;
}
@utility inset-layer {
  background: var(--inset);
  border: 1px solid var(--ink);
}
```

Usage over shadcn: `Card` gets `className="panel rounded-none gap-0 p-0"`, `CardHeader` becomes `title-bar`, `CardContent` is `well` blocks. Set `--radius: 0` and every shadcn `rounded-*` collapses.

### Tabs and top-bar buttons

```css
@utility tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 1.9rem;
  padding-inline: 0.9rem;
  background: var(--tab);
  border: 1px solid var(--ink);
  font: 700 1rem/1 var(--font-heading);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
@utility tab-active {
  background: var(--tab-on);
}
```

shadcn: `TabsList` is a flex row with `gap-1` and no background; `TabsTrigger` is `tab data-[state=active]:tab-active`. Add a count slot: `<span className="text-xs opacity-80">5</span>`.

### Button

```css
@utility btn-game {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 1.9rem;
  padding-inline: 1rem;
  background: var(--btn);
  border: 1px solid var(--ink);
  font: 700 1rem/1 var(--font-heading);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
```

Variants map onto `button.tsx`: `default` is `--btn-grey` (the Print button), `secondary` is `--btn` (top bar), `outline` is `--tab`, accent actions use `--title`. Hover is `--btn-hi` and pressed is `--tab`; both are derived because the screenshots show neither. Focus is a 2px `--warn` outline with 1px offset, also ours.

### Meter

Segmented, flat, 1px gaps, never rounded. This replaces `Progress` styling.

```css
@utility meter {
  height: 0.875rem;
  padding: 1px;
  background: var(--inset);
  border: 1px solid var(--ink);
}
@utility meter-fill {
  height: 100%;
  background: var(--c, var(--meter-ok));
  mask: repeating-linear-gradient(90deg, #000 0 7px, transparent 7px 9px);
}
```

`Progress` indicator gets `meter-fill` with `style={{ width, "--c": tone }}`. Use `--meter-bad` for deficits (health under 50, stress over threshold).

### Table

```css
@utility tbl-head {
  background: var(--field);
  border: 1px solid var(--ink);
  font: 700 0.9rem/1 var(--font-heading);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  padding: 0.5rem 0.65rem;
}
@utility tbl-cell {
  background: var(--well);
  border: 1px solid var(--ink);
  padding: 0.4rem 0.65rem;
  font-variant-numeric: tabular-nums;
}
@utility tbl-cell-alt {
  background: #2b2f3c;
} /* derived: well, minus one step */
```

shadcn `Table` gets compact rows, `TableHead` is `tbl-head` with a caret glyph (`▼`/`▲`) before the label for the sorted column, `TableCell` is `tbl-cell`. Every row also keeps a 1px `--ink` border, which is what separates rows in the game.

### Roster row and group header

```css
@utility roster-row {
  height: 2.25rem;
  background: var(--row);
  border: 1px solid var(--ink);
  border-top: 0;
  color: #fff;
}
@utility roster-row-active {
  background: var(--title);
}
@utility group-header {
  height: 1.6rem;
  padding-inline: 0.6rem;
  font: 700 1.05rem/1 var(--font-heading);
  letter-spacing: 0.05em;
  border: 1px solid var(--ink);
}
```

Group header fills: `bg-[var(--olive)]`, `--teal`, `--green` (`#807c58`, `#588074`, `#608058`). Number colours inside rows: `good-hi` normally, `warn` for mid values, `bad` for bad ones.

### Chip

Chips are the one place we depart from the game, which colours plain text. They stay because the editor shows many coloured categories (DLC, skill group, geyser type) that the game spreads across icons.

```css
@utility chip {
  --c: var(--fg-2);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 1.25rem;
  padding-inline: 0.45rem;
  background: color-mix(in oklab, var(--c) 22%, var(--inset));
  border: 1px solid var(--c);
  color: color-mix(in oklab, var(--c) 70%, #fff);
  font: 700 0.8rem/1 var(--font-heading);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
```

### Others

- **Tooltip / popover:** `background: #242c3c; border: 1px solid var(--ink); box-shadow: inset 0 0 0 1px #3a4358`.
- **Legend panel:** `legend` body, centred `title-bar`, rows of a 20px square swatch with a 1px outline and the label.
- **Alert banner:** `#a52a31` bar with `!`, followed by `well` bullet lines. `#a52a31` is derived from the red swatch and the R5 banner, not sampled cleanly.
- **Portrait frame:** `holo` class: `--holo` radial base with 1.5px `--holo-line` grid at 58px. A CSS approximation of R2/R3, not an extracted asset.
- **Input:** `background: var(--inset); border: 1px solid var(--ink); height: 1.9rem; padding-inline: .6rem`.

## 5a. Components (gallery pass)

Feedback on v2 was that the progress bars and other elements were weaker than the game's. This pass restyles each element on its own, beside a crop of the game where one exists. Gallery with every state, three meter variants and the contrast table: [Component gallery](https://claude.ai/artifact/31h5BGhkwmWk6uH5DLw4qi). Where this section and section 5 disagree, this section wins.

**Meter direction: game-native.** Owner verdict: "just like in the game". The three invented variants (blocks, gauge, readout) are dropped; every bar copies one the game draws. Details below.

### New and changed tokens

| Token                                              | Value                                      | Why                                                                                                              |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `--m-good`                                         | `#51ad52`                                  | Sampled: morale block fill (R1, R12). Replaces `--meter-ok` `#4ca44c`.                                           |
| `--m-bad`                                          | `#c56660`                                  | Sampled: morale need blocks (R1, R12). Replaces `--meter-bad`.                                                   |
| `--m-warn`                                         | `#d9a63a`                                  | Derived: between the sampled green and red, matching the `warn` text hue.                                        |
| `--xp-fill`, `--xp-track`                          | `#6e4057`, `#454545`                       | Sampled: skill XP bar (R1).                                                                                      |
| `--task-fill`, `--task-frame`, `--task-bg`         | `#fab03e`, `#fffef7`, `#090304`            | Sampled: in-world task bar (R8). Fill has a `#e3b27a` top edge and `#e1b079` bottom edge.                        |
| `--g-fill`, `--g-fill-hi`, `--g-slot`, `--g-frame` | `#50c800`, `#5cd418`, `#302820`, `#607470` | Sampled: in-world storage and machine gauges (R13).                                                              |
| `--tip`                                            | `#272c3d`                                  | Sampled tooltip fill (was `#242c3c`). No inner edge line.                                                        |
| `--edge`                                           | `#8f97b5`                                  | Outer 1px ring on inputs, checkboxes, switches and slider tracks so their edges reach 3:1 on `well` and `panel`. |
| `--on-tab`                                         | `#14161e`                                  | Label colour on the active tab. White on `#808bb2` is 3.36:1.                                                    |
| `--fg-2`, `--fg-3`                                 | `#bcbcbc`, `#a9adbd`                       | Lightened from `#b2b2b2` and `#8c90a0`, which fall under 4.5:1 on `panel`.                                       |
| `--bad-text`                                       | `#ff7673`                                  | `#f44a47` is 3.48:1 on `well`; keep it for fills and borders only.                                               |
| `--row`                                            | `#686978`                                  | Roster rows. The sampled `#7e7e89` with white text is 4.01:1.                                                    |
| `--btn-grey-hi`                                    | `#747370`                                  | Hover for the grey default button (4.74:1).                                                                      |
| `--ring`                                           | `--warn`                                   | Focus ring, 2px, 1px offset.                                                                                     |

### Recipes

All square, 1px `--ink`, no radius. Full CSS is in the gallery source; these are the rules a shadcn component needs.

| Element      | shadcn component | Recipe                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button       | `Button`         | Base `btn-game rounded-none hover:bg-[var(--hi)] active:bg-[var(--lo)] active:pt-[2px] active:shadow-[inset_0_2px_0_rgb(0_0_0/.4)] disabled:bg-[#2d303d] disabled:text-[#8e92a3]`. Variants set `--bg --hi --lo`: default `#6a6966 #747370 #4f4e4b`, secondary `#4f5261 #5f6478 #3e4357`, outline `#3e4357 #4a5068 #1f222b`, accent `#7f3d5e #904f70 #602e47`, destructive `#962a28 #ad3432 #6f1f1d`. Hover, pressed and disabled are derived. |
| Tabs         | `Tabs`           | Bottom shade `shadow-[inset_0_-2px_0_rgb(0_0_0/.18)]`. `TabsList` `flex gap-[3px] bg-transparent p-0 overflow-x-auto`; `TabsTrigger` `tab rounded-none data-[state=active]:bg-[var(--tab-on)] data-[state=active]:text-[var(--on-tab)] hover:bg-[var(--tab-hi)]`; count slot `bg-black/30 px-1.5 text-[.8rem]`.                                                                                                                                |
| Checkbox     | `Checkbox`       | `size-[1.4rem] rounded-none border-ink bg-inset shadow-[0_0_0_1px_var(--edge),inset_0_0_0_1px_#3a3f52]`; indicator is an L-shaped tick, `border-b-[3px] border-l-[3px] border-[#5cc844] -rotate-45`.                                                                                                                                                                                                                                           |
| Switch       | `Switch`         | Track `h-[1.55rem] w-12 rounded-none bg-inset data-[state=checked]:bg-[#1d3a26]`; thumb `rounded-none w-[1.1rem] bg-[#9a9eb0] data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-[var(--m-good)]`.                                                                                                                                                                                                                             |
| Slider       | `Slider`         | Track is the meter track plus 10% ticks and `shadow-[0_0_0_1px_var(--edge)]`; range `bg-[var(--m-good)]`; thumb `h-6 w-[.8rem] rounded-none bg-[var(--tab-on)] border-ink`.                                                                                                                                                                                                                                                                    |
| Number input | `Input`          | `h-[2.1rem] rounded-none border-ink bg-inset px-[.6rem] tabular-nums shadow-[0_0_0_1px_var(--edge),inset_0_1px_0_rgb(0_0_0/.4)] aria-invalid:border-bad`. Stepper: two icon `Button`s in an `InputGroup`.                                                                                                                                                                                                                                      |
| Dropdown     | `Select`         | Trigger as `Input` with a 5px caret; content `tip-game p-0`; item `min-h-8 focus:bg-[var(--tab-on)] focus:text-[var(--on-tab)]`; tick as the checkbox tick.                                                                                                                                                                                                                                                                                    |
| Tooltip      | `Tooltip`        | `bg-[#272c3d] border-ink text-[.93rem] px-3 py-2 max-w-[21rem]`, no arrow, `sideOffset={6}`. Keywords `#f2c14a`, names `#e07aa5`, good `#52c079`, bad `#ff7673`.                                                                                                                                                                                                                                                                               |
| Table        | `Table`          | Head `bg-[var(--field)] border-ink font-heading uppercase tracking-[.09em]` with a sort `<button>` and `aria-sort`; cell `bg-[var(--well)] border-ink`; even rows `#2b2f3c`; hover `#383d50`; selected `var(--title)`. Wrap in `overflow-x-auto`.                                                                                                                                                                                              |
| Alert        | `Alert`          | Title bar `bg-[var(--t)]` with a `bg-black/35` "!" square; tones `--t`: `#962a28` critical, `#8a5a10` warning, `#33507a` info, `#2f6b3e` success. Body `pl-[1.9rem] text-[var(--fg-2)]`.                                                                                                                                                                                                                                                       |
| Stat pill    | `Badge`          | `bg-inset border-ink h-[1.9rem] px-[.6rem] gap-[.45rem] font-semibold tabular-nums`; icon and value take the tone colour (`good-hi`, `warn`, `bad-text`).                                                                                                                                                                                                                                                                                      |

### Meters (shadcn `Progress`)

Finding that changes the plan: the game draws **no bars** for stress, breath, bladder, stamina or calories. The duplicant Needs panel lists each as an icon, "Label: value" and a trend arrow (R14), and the top-left colony row is icon, number and unit with no box (R5). The bars the game does draw are four, and each stat uses the nearest one. Anything the game has no bar for is marked derived.

| Style          | Measured from | Recipe                                                                                                                                                                                                                                                                                                                                                                                                                                         | Used for                                                                                               |
| -------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Morale blocks  | R1, R12       | 14x22px cell at 1080p (outline included), 3px gap, no track. 1px `#020303` outline, flat fill `#51ad52` (need row `#c56660`), 1px top `#1d3e1d`, right 2px `#377338`, bottom 3px `#489848 #377338 #244b25`. Built with `color-mix` from one `--c`: top 38%, bottom 90/66/43%, right 66% of black. Label above as plain text, "Morale: 24", extra in red. Ours is a grid of 20 cells that share the width, keeping the 3px gap and 22px height. | Stress, health, morale (stress and health tones are derived)                                           |
| Skill XP box   | R1            | Full width, 30px interior, 1px black top, 2px black bottom, fill `#6e4057`, empty `#454545`, white numerals centred "14145 / 17545". No segments, no gradient.                                                                                                                                                                                                                                                                                 | XP to next level, research points                                                                      |
| Task bar       | R8            | 2px `#fffef7` frame, `#090304` interior, fill gradient `#e3b27a 15% #f2b052 35% #fab03e 75% #e1b079`. No numbers.                                                                                                                                                                                                                                                                                                                              | Research progress. Geyser activity (derived): orange active part, `#6b6b6b` dormant part, white marker |
| Capacity gauge | R13           | 3px `#607470` frame with a 1px black outline, `#302820` slot, 2px inset fill `#50c800` to `#5cd418`, tick lines every 10% at 14% white. Over max: hatched amber cap.                                                                                                                                                                                                                                                                           | Amount with max: calories, stamina, bionic oil, storage (derived)                                      |
| Needs row      | R14           | 1.5rem icon, "Label: value", a trend arrow on the right (one arrow, two for fast). Value white; amber or red past a threshold is ours.                                                                                                                                                                                                                                                                                                         | Vitals list on the duplicant card                                                                      |

Tone by value (all derived): amount and health `>= 50%` / `>= 25%` (health `70` / `35`) good, warn, bad; stress `<= 40%` / `<= 70%`. Every bar prints the value and a state word, so colour is not the only cue. Amber `#d9a63a` is the only invented hue; green and red are the sampled morale hues.

Not found in any capture: bionic oil and battery bars, a Vitals-screen table, a research bar. The gallery marks each use of an existing bar for those as derived.

Accessibility, measured: XP fill on empty track is 1.16:1 in the game's own colours, so the centred numerals carry the value; the light-track gauge fails 3:1 against its fill, so the dark slot is used; the game's empty grey on the task bar interior is 2.1:1, so dormant uses `#6b6b6b` (3.8:1).

Shadcn: `Progress` keeps Radix for XP, task and gauge (restyle `Root` and `Indicator`). Blocks and Needs rows are plain markup with `role="meter"`. Class strings are in the gallery.

### Game checks on other elements

Re-sampled against screenshots, then changed to match:

| Element                                   | Game                                                                                                            | Change                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tab                                       | 1px black outline, flat `#3e4357`, 2px darker band at the bottom (`#2d303d`, `#2a2d3b`), no top highlight       | Replaced the top highlight with an `inset 0 -2px` shade (active tab 28% black) |
| Button                                    | `#4e5069` face (Steam sample; section 5 keeps `#4f5261`), 1px outline, 1px darker bottom edge, no top highlight | Replaced the top highlight with an `inset 0 -1px` shade                        |
| Tooltip                                   | `#272c3d`, plain 1px black outline, no inner edge                                                               | Removed the inset edge, new fill                                               |
| Alert banner                              | `#962a28` bar, plain white "!" glyph, no dark square                                                            | Removed the dark square                                                        |
| Stat row                                  | Icon, number, unit; no box                                                                                      | Unboxed is the default; the boxed pill stays as an editor extension            |
| Input, checkbox, switch, slider, dropdown | No in-game capture (the wiki's inputs are a developer tool)                                                     | Unchanged, marked derived                                                      |

### Contrast (WCAG 2.1, from the hex values above)

Text pairs all reach 4.5:1 and bars and control edges reach 3:1. Lowest text results: white on the grey button hover 4.74:1, black on the teal group header 4.75:1, `--bad-text` on `well` 4.77:1, warn text on `panel` 4.88:1, `--fg-2` on `panel` 5.00:1, `--fg-3` on `well` 5.54:1. Lowest non-text: control edge on `panel` 3.28:1, bad fill on track 4.12:1, XP fill on track 3.66:1. Where the game's own pair fails, the gallery lists both: white on the active tab 3.36:1, `#b2b2b2` on `panel` 4.47:1, `#f44a47` on `well` 3.48:1, white on the `#7e7e89` roster row 4.01:1, `#6e4057` XP fill on track 1.92:1. Focus ring `#ffa649` is 4.88:1 on `panel`.

Other rules: base 14px (13px under 420px) and all sizes in `rem`; 44px minimum height for buttons and options on coarse pointers; tab strips and tables scroll sideways inside their own box; `prefers-reduced-motion` removes the switch slide.

### Added references

Collected 2026-11-05. Used for comparison and colour sampling only.

| #   | Screen                                                    | Source                                                                                                                              |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| R8  | In-world task progress bar                                | [wiki.gg File:Skill_up.jpg](https://oxygennotincluded.wiki.gg/wiki/File:Skill_up.jpg)                                               |
| R9  | Daily Reports (table, Prev/Next, close)                   | [wiki.gg File:Daily_Reports.png](https://oxygennotincluded.wiki.gg/wiki/File:Daily_Reports.png)                                     |
| R10 | HUD warning lines                                         | Steam store screenshot 6                                                                                                            |
| R11 | Notification Designer (inputs, checkboxes; Klei dev tool) | [wiki.gg File:Notification_Designer_UI.png](https://oxygennotincluded.wiki.gg/wiki/File:Notification_Designer_UI.png)               |
| R12 | Morale meter preview (block colours, bevel)               | [wiki.gg File:Morale_preview.png](https://oxygennotincluded.wiki.gg/wiki/File:Morale_preview.png)                                   |
| R13 | In-world storage and machine gauges                       | [Steam, Bionic Booster Pack, screenshot 3](https://store.steampowered.com/app/3302470/Oxygen_Not_Included_The_Bionic_Booster_Pack/) |
| R14 | Duplicant Info panel, Needs list (older light build)      | [gamepressure.com Duplicants Profile](https://www.gamepressure.com/oxygen-not-included/profile/z59d44)                              |

Still not captured: a Vitals table, bionic oil and battery bars, a research bar, slider, stepper, dropdown list, and hover, pressed and disabled states. All are marked derived in the gallery. Direct `/images/` URLs on wiki.gg download with plain `curl`; only the `api.php` endpoint blocked scripted requests.

## 6. Fonts

| Role    | Font                                                | Package                          | Why                                                                                                                                                                                                                                                                                                                                                              |
| ------- | --------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading | **Rajdhani** 600 to 700, caps, +0.05em              | `@fontsource/rajdhani`           | The game's headings (the Skills title, INTERESTS, TRAITS, tabs) are condensed, squared, medium-heavy caps. In a side-by-side render of 20 open faces, Rajdhani had the right squared curves and width. Chakra Petch and Quantico were too wide, Teko too narrow, Squada One too heavy, Saira Condensed rounder. It is not the game's font, which is proprietary. |
| Body    | **Noto Sans** 400 to 700                            | `@fontsource-variable/noto-sans` | The body text in every screenshot reads as Noto Sans (humanist, open apertures, the same numerals). This was matched by eye on glyph shapes; the game's font files were not inspected. It is also open source and covers more scripts than the other candidates.                                                                                                 |
| Numbers | Noto Sans with `font-variant-numeric: tabular-nums` | (same)                           | The game shows numbers in the body face, not a monospace. Mono stays only for the raw-data tree.                                                                                                                                                                                                                                                                 |

Remove `@fontsource/barlow`, `@fontsource/chakra-petch` and, except for the raw tree, `@fontsource-variable/jetbrains-mono`.

## 7. Page audit and component choices

The shadcn blocks below still apply. Use `shadcn view` and `shadcn add`, adapt rather than paste. Restyle through the tokens above instead of per-block overrides.

| Page          | Blocks / components                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell         | `sidebar-07` (icon-collapsible, structure), `sidebar-16` (sticky header), `breadcrumb`, `hover-card`, `button-group`, `kbd`, `dropdown-menu`                                                                                                                              |
| Load          | `empty` (drop-zone variant with dashed border, `EmptyMedia`), `progress`, `item`, `alert` (error), `kbd`, `input-group` with copy button for the save path                                                                                                                |
| Overview      | `dashboard-01` (section cards + chart area), `card`, `chart` (`chart-bar-mixed`: stress or skills per duplicant), `avatar` group, `progress`, `item-group`, `field`/`field-group` for settings, `switch`                                                                  |
| Duplicants    | master-detail: `item-group` + `scroll-area` (list), `card`, `tabs` (line variant with icons and counts), `slider` + `input-group` (attributes), `accordion` (skills by group), `toggle-group` (interests, appearance pickers), `command` (trait picker), `alert`, `badge` |
| Critters      | `table` (dashboard-01 data-table pattern, TanStack virtual), `tabs`/`toggle-group` family filter with counts, `input-group`, `dropdown-menu` row actions, `button-group` bulk actions, `empty`, `skeleton`                                                                |
| Geysers       | card grid (`card`, `progress` output gauge, `badge`), `sheet` for editing, `field-group`, `input-group` with units                                                                                                                                                        |
| Materials     | `table`, `toggle-group` state filter (coloured), `progress` stacked loose/stored, `sheet` editor, `command` search                                                                                                                                                        |
| Research      | `accordion` by tier, `checkbox` tiles, `progress`, `alert-dialog` for "Research everything"                                                                                                                                                                               |
| Space         | `card` grid or compact `table`, `switch`, `badge`                                                                                                                                                                                                                         |
| Map           | `resizable` panels (canvas / inspector), `toggle-group` toolbar, `scroll-area` legend, `card` inspector                                                                                                                                                                   |
| Game settings | `field-set`/`field-legend`/`field-group` with `orientation="responsive"`, `toggle-group` for 3-level options, `separator`, `ChangedBadge`                                                                                                                                 |
| Raw           | `collapsible` tree rows, `input-group` search with `kbd`, `alert`, `empty`                                                                                                                                                                                                |

Per-page changes, in the game's terms:

| Page          | Change                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shell         | Top tab strip replaces the sidebar. Left: brand. Right: file name, undo/redo, download. Phone: scrollable tab strip.                             |
| Overview      | Cycle badge and status strip, alert banners, vitals table with segmented meters, grey legend panel for content, `title-bar` panels for the rest. |
| Duplicants    | Left roster panel with portrait and stat boxes, grouped rows, sort strip. Right: card with Identity and Vitals, tabbed Traits and Attributes.    |
| Critters      | Table with `tbl-*`, family as chip, baby/adult grouping as `group-header`.                                                                       |
| Geysers       | Table with output meters; type swatch as legend colour; tooltip for details.                                                                     |
| Materials     | Table; state swatch from the legend; loose/stored as a two-segment meter.                                                                        |
| Research      | Lane bands (`#3c4052` / `#42475e`) per branch, cards in `--btn-grey`.                                                                            |
| Space         | Compact table, status as chip.                                                                                                                   |
| Map           | Legend as grey legend panel; toolbar as `tab` buttons.                                                                                           |
| Game settings | `well` sections under `title-bar` panels, three-level options as a tab row.                                                                      |
| Raw data      | Same tree; types coloured by the `good/bad/warn/gold/love` tokens.                                                                               |
| Load          | Dialog language: centred title bar, grey primary button, dark secondary.                                                                         |

## 8. Colour categories (derived, not sampled)

The game does not colour DLC, skill groups or geyser classes on one screen, so these are ours and are the only colours not traced to a screenshot. They exist so tables stay scannable. Keep chroma moderate so they read as accents on slate, and check chip text contrast (4.5:1) when wiring.

| Group        | Colours                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DLC          | Spaced Out `#b58cff`, Frosty `#7fd4ff`, Bionic `#ffb14a`, Prehistoric `#9ad65a`, Aquatic `#3fd0c9`                                                                   |
| Skill group  | Mining `#d99a4e`, Research `#4fc3f7`, Farming `#7ed957`, Cooking `#f2704a`, Hauling `#8fa3c8`, Ranching `#ff8fb1`, Building `#f4d03f`, Tech `#3fd0c9`, Art `#c58bff` |
| Geyser class | Water `#4aa3ff`, Polluted `#9fb84a`, Salt `#5fd0d8`, Gas `#6fe0c3`, CO2 `#98a3bd`, Sulfur `#ecd94f`, Hot `#ff8a3d`                                                   |
| Stress level | Meter green `--meter-ok` under 25%, `--warn` 25 to 80%, `--bad` over 80%                                                                                             |

## 9. What the mockups match, and what they don't

Matches (checked with the blend slider in the Artifacts): panel rim and outline, title bar colour and height, tab strip and active colour, roster rows and group headers, selected row, section layering in cards, trait polarity colours, heading and body type, segmented meter, grey primary button and dark secondary button, legend panel, alert banner, tooltip.

Does not match, and why:

- **Fonts.** Rajdhani is the nearest open face to the game's heading font; letterforms differ slightly from the game's.
- **Icons, sprites, portraits.** The game's art is Klei's and not reproduced. Mockups use stand-in drawings and Lucide icons; the app keeps the real duplicant renderer (`react-oni-duplicant`).
- **Portrait background.** The hologram grid is approximated with CSS gradients, not extracted.
- **Vitals, consumables and resources tables.** No screenshot found. Rows and alt rows (`#303443`, `#2b2f3c`) are derived from the section colour.
- **Hover, pressed, disabled, focus.** Not in any screenshot; defined by us.
- **Density.** Game body text is about 14 to 15px at 1080p. On 1366 to 1536px laptops it is tighter than a web editor usually is; the `87.5%` html scale covers it.
- **Pixel precision on R5.** 720p JPEG, so colours are medians and may be off by a few steps. R1 to R4 are 1080p-class sources and are accurate.

## 10. Implementation plan

Dark only; the old light/dark plumbing is removed in PR 0.

### PR 0: Foundation (L). Land first.

Wait for `feat/save-polish` (touches `App.tsx`, `load-states.tsx`, `changes-popover.tsx`) to merge, or keep the `App.tsx` change to the shell wrapper only. Other edits are in files no worker is touching.

Files:

- `apps/web/package.json`, `pnpm-workspace.yaml` (catalog): add `@fontsource/rajdhani`, `@fontsource-variable/noto-sans`; drop Barlow, Chakra Petch; keep JetBrains Mono for the raw tree only. Drop `next-themes`.
- `apps/web/src/index.css`: the single dark token block from section 5, shadcn mapping, `@utility` recipes, font imports, `--radius: 0`, `html { font-size: 87.5% }` under 1600px.
- `apps/web/src/main.tsx`, `App.tsx` (shell wrapper only), `components/preferences-dialog.tsx`, `components/ui/sonner.tsx`: remove the theme provider and theme setting; force `class="dark"` or no class at all.
- `apps/web/src/lib/categories.ts` (new): category maps from section 8 and `catStyle`.
- `apps/web/src/components/dlc-badge.tsx`: rewrite on `chip` (removes the hard-coded palette).
- `apps/web/src/components/common.tsx`: `DuplicantAvatar` (portrait frame with `holo`), `CategoryChip`, `Meter`, `PageHeader`, `ChangedBadge`, `LegendPanel`. Keep `CommitInput`, `NumberField`, `Hint`, `SearchPicker` API-stable. Split into `components/common/*.tsx` only if the file passes about 350 lines.
- `apps/web/src/components/ui/`: `card.tsx` (panel plus title bar), `badge.tsx` (add `chip` variant), `progress.tsx` (segmented meter), `tabs.tsx` (game tab strip, icon and count slot), `button.tsx` (variants per section 5), `table.tsx` (compact, sticky header with caret), `input.tsx`, `select.tsx`, `dialog.tsx` (centred title bar, square close), `tooltip.tsx`/`popover.tsx` (tooltip recipe); remove `sidebar.tsx` usage once the tab strip is in. Note `feat/duplicant-traits` adds `ui/alert.tsx`: do not add it here.
- `apps/web/src/components/app-sidebar.tsx` becomes `app-tabs.tsx`; `site-header.tsx` becomes the top bar; `App.tsx` shell wrapper only.
- `apps/web/src/components/portrait/Portrait.tsx`, `portrait/sprites.ts`: render partial layers; `canDrawPortrait` becomes "has at least headshape".
- Visual regression: update Playwright screenshots if any exist under `apps/web/e2e`.

### Page PRs, ordered by impact

| #   | Page                                                                     | Size | Worker conflict                                                                                                                                          |
| --- | ------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Duplicants (list, header meters, Traits, Attributes, Skills, Appearance) | L    | **Wait**: `feat/duplicant-traits` is editing `DuplicantsPage.tsx`, `ProfileActions.tsx`, `tabs.tsx`, adds `TraitPicker.tsx`. Start only after it merges. |
| 2   | Overview                                                                 | M    | Free (note `feat/save-polish` edits `App.tsx`/changes only).                                                                                             |
| 3   | Critters                                                                 | M    | Free.                                                                                                                                                    |
| 4   | Materials                                                                | M    | **Wait**: `feat/delete-debris` (`materials-page.tsx`, worker snapshot).                                                                                  |
| 5   | Geysers                                                                  | M    | **Wait**: `feat/geyser-type` (PR 17).                                                                                                                    |
| 6   | Load screen, error and loading states                                    | S    | **Wait**: `feat/save-polish` (`load-states.tsx`, `App.tsx`).                                                                                             |
| 7   | Game settings                                                            | S    | Free.                                                                                                                                                    |
| 8   | Research                                                                 | S    | Free.                                                                                                                                                    |
| 9   | Space                                                                    | S/M  | **Wait**: `feat/space-poi` (PR 18).                                                                                                                      |
| 10  | Map                                                                      | M    | Free (only legend/toolbar chrome; canvas untouched).                                                                                                     |
| 11  | Raw data                                                                 | M    | **Wait**: `feat/raw-search` (PR 19, edits `raw-page.tsx`). Also fix the first-paint "Nothing here." state.                                               |

Free to start in parallel right after the foundation merges: Overview, Critters, Game settings, Research, Map. Everything else is queued behind the named branch.

### Acceptance checklist for every PR

Screenshots at 1920 and 1440 next to the matching reference or mockup, no hard-coded Tailwind palette colours (`grep -E "(text|bg|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|violet|purple|pink)-[0-9]"` returns nothing), `rounded-*` absent outside the cycle badge and avatars, numbers use `tabular-nums`, an `Empty` and a `Skeleton` state exist, `vp check` and e2e pass.

### Caveats

- Fonts and the move from sidebar to top tab strip are the most visible calls. Fonts are isolated to `index.css`; the tab strip is isolated to the shell.
- Category hues (section 8) are not from the game. Verify contrast when tokens are wired.
- Mobile layout is not mocked in this revision; the plan is the tab strip scrolling horizontally and panels stacking, to be screenshotted in PR 0.
