# Duplicity UI design direction

Status: proposal, replaces the rejected "Colony Control Panel" direction. Page audit from `origin/test/e2e-playwright` (c860e56) and `beautiful-galaxy.sav`, desktop 1440x900 and phone 390x844.

Mockups (static HTML, real values from `beautiful-galaxy.sav`, desktop and 390px phone):

- [Duplicants list with open editor](https://claude.ai/artifact/JCQicj1QwyqEvBiu68ZEnQ)
- [Overview](https://claude.ai/artifact/NrGiJaBydxgdkYQ5ccpnwi)

The mockups draw portraits as stand-in vector faces. The app keeps rendering the real sprite portraits.

## 0. Decisions for the owner

1. **Dark only.** Recommended. The game UI is dark slate with a magenta title bar; a light theme would need a second invented identity (what is "paper" in ONI?) and would double every category colour check. Dark-only also removes the theme toggle and half the token surface. If light is wanted later, it is a token override, not a redesign.
2. **Fonts are matched by eye.** The game's own UI faces are proprietary; I could not confirm their names (a Klei forum thread mentions "Graystroke" for the in-game font). Saira Semi Condensed and Nunito Sans are the closest free fits I found. Swap is one line in `index.css`.
3. **Mauve title bar as the signature.** It is the most recognisable frame trait of the game (skills, schedule, blueprint printing screens). It is borrowed as a colour and shape, not as art.
4. **Vitals, consumables and starmap were not viewed directly.** Only the skills screen, blueprint-printing screen, schedule editor, overlay bar and research tree could be viewed as screenshots; the rest is described from guide text. The direction does not depend on them.

## 1. Audit

What already works and should be kept: shadcn `radix-nova` style, `Item`, `Empty`, `InputGroup` with unit add-ons, `Progress`, `ButtonGroup`, `Kbd`; fonts through `--font-heading/--font-sans/--font-mono`; real duplicant portraits from the original sprite sheet; virtualised critter and material tables; lazy-loaded pages.

The "stock" feeling comes from three things: (a) a zero-chroma grey palette in light mode and a single teal accent, (b) every page is the same `Card` with a title, a description and a plain table or form, (c) colour is used for almost nothing except DLC chips and the wildness badge.

### Top 10 problems (ranked)

1. **Neutral grey theme.** `--background/--card/--muted/--border` are all `oklch(x 0 0)`. Both themes read as the shadcn default; only the teal primary differs. No surface hierarchy (page vs card vs inset) beyond a 1px border, and nothing says Oxygen Not Included.
2. **Hard-coded palette colours instead of tokens.** `text-violet-700 dark:text-violet-300`, `bg-amber-500/15` etc. in `dlc-badge.tsx`, `critters-page.tsx`, `materials-page.tsx`, `map-page.tsx`, `raw-page.tsx`. Violates the "theme only through CSS variables" rule and means there are two separate colour systems.
3. **Categorical data is barely colour-coded.** Only DLCs, wildness and element state are tinted. Critter family, geyser type, trait category (good/bad/stress/joy), stress and health level, research tier are plain grey text or uniform cards.
4. **Duplicants editor: all tabs share one visual shape.** Traits are 2-column grey boxes with an "x"; attributes are 16 identical sliders in a flat list; skills are tiny toggle groups. Nothing signals trait polarity, skill category, or which attributes the duplicant is good at. The header's four thin meters (stress, health, calories, skills) are all the same teal, so level is unreadable.
5. **Avatars are inconsistent.** Real portraits for some duplicants; coloured initials (`RE`, `RA`) for others because `canDrawPortrait` needs all three layers. The two states sit side by side in the list and look broken. Avatar has no status ring or identity colour.
6. **Overview is four equal KPI cards plus a form.** The KPI footer rows are a second band of grey that adds height (cards are ~190px; on phones the four stack to four screens). The colony name field and two switches take half the page, while nothing shows colony health (dupes, stress, geyser output). Wasted right half on desktop.
7. **Tables are tall and flat.** Critters, geysers, materials, space: ~50px rows, no zebra or grouping, headers same weight as body, numeric columns not aligned by unit, actions are tiny ghost icons. Geyser and space names are bordered inputs in every row, which makes the table look like a form. 192 critters have no grouping, pagination or family filter chips with counts.
8. **Shell: weak identity and mobile header.** Sidebar is the stock dashboard-01 rail (same surface as the page). Header packs breadcrumb, five DLC chips, undo/redo, download, theme, settings in one row; on 390px the breadcrumb wraps to two lines and DLC chips vanish. No persistent "N unsaved edits" indicator.
9. **Empty and loading states are inconsistent.** Duplicants/Raw show grey skeleton rectangles or "Nothing here." (Raw data rendered that on first paint before the tree arrived: either a race or a missing loading state). Filter-with-no-results has no `Empty`. Load screen is a small centred `Empty` with no drop-zone affordance and no progress treatment beyond a number.
10. **Density and spacing are inconsistent.** Card padding, gaps (`gap-4 md:gap-6`), row heights and input widths (`w-32` number field, `w-[...]` selects) vary per page. Game settings is a 2-column wall of selects with 5 different label/description patterns; Research is 112 near-identical cards with a switch, no grouping by tier.

### Per-page notes

| Page             | Problems                                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load             | Plain Empty; no dropzone state, no recent file, instructions as inline `code`; error/loading states small and unbranded.                                                                                                                                            |
| Overview         | See 6. Duplicated information (DLCs appear in the header and again in a Game card). Debug-mode explanation is a long paragraph beside a badge.                                                                                                                      |
| Duplicants list  | Rows show a stress bar with the same colour at 2% and 90%; no role/hat; no sort; "Everyone" menu is an unlabeled ghost button.                                                                                                                                      |
| Duplicant editor | See 4. Tabs are a pill list with no icons or counts (Traits 5, Skills 5/44). Gender select, name input and four meters pack into one card header without hierarchy. Appearance tab: good live preview, but pickers are 6 `Select`s ("Style 11") with no thumbnails. |
| Critters         | Family column is plain text; wildness chip is the only colour; no baby/age grouping; row actions are 3 tiny icons (+ text button) per row.                                                                                                                          |
| Geysers          | Table with an input per row; type text duplicates name; no visual for erupting vs dormant or output; no summary of total output beyond the Overview.                                                                                                                |
| Materials        | State is the only colour; loose/stored/total are three numeric columns with no visual proportion; temperature is plain text (no thermal colour).                                                                                                                    |
| Research         | 112 cards, uniform; no tier/branch grouping; progress bar is a thin teal line.                                                                                                                                                                                      |
| Space            | Table in a card, horizontal scrollbar visible at 1440 wide; status badges (Start, Visited) are neutral.                                                                                                                                                             |
| Map              | Canvas is good. The empty canvas area is flat black with the map top-left; legend rows are plain; toolbar buttons are three different styles.                                                                                                                       |
| Game settings    | See 10; no indication of which values differ from default.                                                                                                                                                                                                          |
| Raw data         | Dense mono tree is right, but types are barely distinguished, and the Warning banner uses its own amber.                                                                                                                                                            |

## 2. Reference study

Screens viewed (screenshots on the community wiki, game-owned artwork not reproduced here):

- [Skills screen](https://oxygennotincluded.wiki.gg/images/Screenshot_Skills_Menu.webp), from the [Skills page](https://oxygennotincluded.wiki.gg/wiki/Skills)
- [Blueprint printing screen](https://oxygennotincluded.wiki.gg/images/Printing_selection.png) and [one blueprint card](https://oxygennotincluded.wiki.gg/images/Example_duplicate_bonuses.png), from [Duplicants](https://oxygennotincluded.wiki.gg/wiki/Duplicants)
- [Schedule editor](https://oxygennotincluded.wiki.gg/images/Schedule.png), from [Schedule](https://oxygennotincluded.wiki.gg/wiki/Schedule)
- [Overlays bar](https://oxygennotincluded.wiki.gg/images/Overlays.png) and [research tree](https://oxygennotincluded.wiki.gg/images/Research-Tree.png), from [Research](https://oxygennotincluded.wiki.gg/wiki/Research)
- Guide text for the main screen, vitals and tabs: [gamepressure.com main screen](https://www.gamepressure.com/oxygen-not-included/main-screen/z39cfa)

### Traits borrowed

| Trait observed in game                                                                                   | How it is used here                                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Muted blue-slate panels, near-black navy cells inset in them                                             | `--panel` (#272d4a) with `.well` insets (#1a1f36). Surface ladder: void, page, panel, well.                                                 |
| Magenta/mauve title bar on every window, small-caps display type, close button on the bar                | `.panel-head` in `--bar` (#86386b), uppercase condensed heading, 2px dark outline, 1px top highlight. One per panel.                        |
| Chunky 2px near-black outlines with a thin lighter inner edge                                            | Every frame: `border: 2px solid --edge` plus `inset 0 0 0 1px --hi` and a 3px hard bottom shadow. Radius 12px for panels, 8px for controls. |
| Tab buttons: icon + uppercase label, dark cells, the active tab filled periwinkle                        | `.tab`, active `--tab-on` (#6f7cc4). Same fill for the selected roster row. Counts as small mono suffix.                                    |
| Rows with a heart or coloured fill marking interests and selection, orange outline for the focused skill | Skill-group chips carry the group colour; selected row uses the periwinkle fill; focus ring is teal.                                        |
| Segmented stat bars (morale shown as green blocks, empty red-outlined blocks)                            | `.meter`: dark trough with block-masked fill, 6px blocks and 2px gaps. Used for stress, health, calories, attributes, geyser output.        |
| Trait names coloured by polarity (green good, red bad), effect line below in grey                        | Trait cards: name in `--good`/`--bad`/`--stress`/`--joy`/`--gene`, effect text muted, category chip.                                        |
| Blueprint-cyan grid behind the duplicant in the printing screen                                          | Portrait box in the editor and `.av.grid`: cyan 16px grid over a deep blue radial.                                                          |
| Chunky buttons with a dark outline that press down                                                       | `.btn`: bottom shadow shrinks and the button moves 2px on `:active`.                                                                        |
| Research tree as horizontal tinted lanes per category                                                    | Planned for the Research page: lanes tinted by category, nodes as wells.                                                                    |
| Playful tone: friendly body copy, short labels                                                           | Keep copy short and plain; no sci-fi jargon.                                                                                                |

Not borrowed: sprites, logos, icons, the game's fonts, the exact hex values (all colours here are eyeballed and re-derived).

### Fonts

| Role                                                       | Font                                                                      | Why                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headings, labels, buttons, big numerals (`--font-heading`) | **Saira Semi Condensed** 500/600/700, uppercase with 0.06-0.14em tracking | The game's headings are condensed, squared with rounded corners, set in capitals. Saira Semi Condensed has the same squared-round construction and a real weight range. It is not a trendy grotesque and it keeps numerals tabular. |
| Body, descriptions, form text (`--font-sans`)              | **Nunito Sans** 400/600/700                                               | The game's body text is a friendly humanist sans. Nunito Sans is humanist with softened terminals and stays legible at 13px in dense rows.                                                                                          |
| Raw data, readouts (`--font-mono`)                         | **JetBrains Mono** (already installed)                                    | Kept for numeric readouts and the Raw tree.                                                                                                                                                                                         |

Installed through `@fontsource` as today. Chakra Petch and Barlow are removed.

## 3. Direction: "Printing pod"

An in-game tool for the colony, drawn with CSS. Dark slate panels with outlined, bevelled frames; a mauve title bar on every panel; periwinkle for selection; oxygen teal for actions and navigation; a blueprint-cyan grid wherever a duplicant is shown. Colour carries meaning: element state, trait polarity, stress and health, DLC, skill group, geyser type. Everything is built from shadcn components themed through CSS variables.

### 3.1 Tokens (dark only, `apps/web/src/index.css`)

```css
:root {
  color-scheme: dark;
  --background: #171c30;
  --foreground: #eef0fb;
  --card: #272d4a; /* panel */
  --card-foreground: var(--foreground);
  --popover: #323a5e;
  --popover-foreground: var(--foreground);
  --primary: #1f8e8c; /* oxygen teal, buttons, active nav */
  --primary-foreground: #ffffff;
  --secondary: #323a5e;
  --secondary-foreground: var(--foreground);
  --muted: #1a1f36; /* well */
  --muted-foreground: #aab0d0;
  --accent: #6f7cc4; /* selection, active tab */
  --accent-foreground: #0f1330;
  --destructive: #ff6b66;
  --border: #0b0e1c; /* the dark outline */
  --input: #1a1f36;
  --ring: #3fd0c9;
  --radius: 0.5rem;

  --bar: #86386b; /* panel title bar */
  --bar-foreground: #ffffff;
  --highlight: rgb(255 255 255 / 0.1); /* inner bevel */
  --grid: #2bb6e8; /* blueprint grid */

  --sidebar: #10202b;
  --sidebar-foreground: #aab0d0;
  --sidebar-primary: #1f8e8c;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #183040;
  --sidebar-accent-foreground: #eef0fb;
  --sidebar-border: #0b0e1c;
  --sidebar-ring: #3fd0c9;
}
```

Hex values are used for readability in this doc; implement them as `oklch()` like the rest of the file. Do the contrast check (4.5:1) on every `--cat-*` chip text against its tinted chip background when wiring.

### 3.2 Panel and frame primitives

Added to `index.css` as Tailwind v4 `@utility` rules (not components), so they sit on top of shadcn:

```css
@utility panel {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 0.75rem;
  box-shadow:
    inset 0 0 0 1px var(--highlight),
    0 3px 0 var(--border);
  overflow: hidden;
}
@utility panel-head {
  /* title bar */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--bar);
  color: var(--bar-foreground);
  border-bottom: 2px solid var(--border);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.22);
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
@utility well {
  /* inset cell: inputs, trait cards, tiles */
  background: var(--muted);
  border: 2px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: inset 0 2px 0 rgb(0 0 0 / 0.25);
}
@utility meter {
  /* --v 0-100, --c colour */
  height: 12px;
  padding: 2px;
  border-radius: 4px;
  background: var(--border);
  & > i {
    display: block;
    height: 100%;
    width: calc(var(--v) * 1%);
    background: var(--c);
    border-radius: 2px;
    mask: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 8px);
  }
}
@utility chip {
  /* set --c on the element */
  color: color-mix(in oklab, var(--c) 80%, #fff);
  background: color-mix(in oklab, var(--c) 18%, var(--muted));
  border: 1px solid color-mix(in oklab, var(--c) 55%, transparent);
  border-radius: 0.375rem;
  padding: 0.125rem 0.4rem;
  font: 700 11px var(--font-heading);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
```

Page background: dot grid `radial-gradient(rgb(111 124 196 / 0.10) 1px, transparent 1px)` at 22px. Headings are `font-heading` uppercase. No gradients except the blueprint portrait box.

### 3.3 Category colour map

All are `--cat-*` tokens in `index.css`, used through `catStyle(domain, key)` in `apps/web/src/lib/categories.ts` (sets `--c`). Values below are the dark-theme values used in the mockups.

| Domain                             | Key                                                             | Token                       | Value                                                                                     |
| ---------------------------------- | --------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| **Trait polarity**                 | Good                                                            | `--good`                    | #5ad28b                                                                                   |
|                                    | Bad                                                             | `--bad`                     | #ff6b66                                                                                   |
|                                    | Stress reaction                                                 | `--stress`                  | #ff9a3d                                                                                   |
|                                    | Joy reaction                                                    | `--joy`                     | #ff7bb5                                                                                   |
|                                    | Genetic / congenital                                            | `--gene`                    | #9d8cff                                                                                   |
| **Stress** (also health, inverted) | Calm < 25%                                                      | `--lv1`                     | #5ad28b                                                                                   |
|                                    | Uneasy 25-50%                                                   | `--lv2`                     | #b9d84a                                                                                   |
|                                    | Stressed 50-80%                                                 | `--lv3`                     | #ff9a3d                                                                                   |
|                                    | Breaking >= 80%                                                 | `--lv4`                     | #ff5a55                                                                                   |
| **Health**                         | >= 60 healthy, 25-60 hurt, < 25 critical                        | `--lv1` / `--lv3` / `--lv4` |                                                                                           |
| **Element state**                  | Solid                                                           | `--state-solid`             | #c9a06a (clay)                                                                            |
|                                    | Liquid                                                          | `--state-liquid`            | #4aa3ff                                                                                   |
|                                    | Gas                                                             | `--state-gas`               | #6fe0c3                                                                                   |
|                                    | Vacuum                                                          | `--state-vacuum`            | #7b8096                                                                                   |
| **DLC**                            | Spaced Out!                                                     | `--dlc-spaced`              | #b58cff                                                                                   |
|                                    | Frosty Planet                                                   | `--dlc-frosty`              | #7fd4ff                                                                                   |
|                                    | Bionic Booster                                                  | `--dlc-bionic`              | #ffb14a                                                                                   |
|                                    | Prehistoric Planet                                              | `--dlc-prehistoric`         | #9ad65a                                                                                   |
|                                    | Aquatic Planet                                                  | `--dlc-aquatic`             | #3fd0c9                                                                                   |
|                                    | Base game                                                       |                             | `--muted-foreground`                                                                      |
| **Skill group / hat**              | Mining                                                          | `--sk-mining`               | #d99a4e                                                                                   |
|                                    | Research                                                        | `--sk-research`             | #4fc3f7                                                                                   |
|                                    | Farming                                                         | `--sk-farming`              | #7ed957                                                                                   |
|                                    | Cooking                                                         | `--sk-cooking`              | #f2704a                                                                                   |
|                                    | Hauling                                                         | `--sk-hauling`              | #8fa3c8                                                                                   |
|                                    | Ranching                                                        | `--sk-ranching`             | #ff8fb1                                                                                   |
|                                    | Building                                                        | `--sk-building`             | #f4d03f                                                                                   |
|                                    | Technicals                                                      | `--sk-tech`                 | #3fd0c9                                                                                   |
|                                    | Art                                                             | `--sk-art`                  | #c58bff                                                                                   |
|                                    | remaining groups (Medicine, Piloting, Suits, Atomic, Astronomy) | `--sk-*`                    | stepped hues, same L and C                                                                |
| **Geyser class**                   | Clean water                                                     | `--g-water`                 | #4aa3ff                                                                                   |
|                                    | Polluted water, polluted brine                                  | `--g-dirty`                 | #9fb84a                                                                                   |
|                                    | Salt water                                                      | `--g-salt`                  | #5fd0d8                                                                                   |
|                                    | O2, H2                                                          | `--g-gas`                   | #6fe0c3                                                                                   |
|                                    | CO2                                                             | `--g-co2`                   | #98a3bd                                                                                   |
|                                    | Sulfur                                                          | `--g-sulfur`                | #ecd94f                                                                                   |
|                                    | Hot vents, steam                                                | `--g-hot`                   | #ff8a3d                                                                                   |
|                                    | Volcano (magma, minor)                                          | `--g-volcano`               | #ff5a55                                                                                   |
|                                    | Metal volcano                                                   | `--g-metal`                 | #c9824a                                                                                   |
|                                    | Oil                                                             | `--g-oil`                   | #8a6a4a                                                                                   |
| **Critter family**                 | 13 families                                                     | `--critter-1..13`           | fixed L and C, hue stepped 27.7 deg, assigned alphabetically so a family keeps its colour |
| **Research tier**                  | researched / not                                                | `--primary` / `--muted`     |                                                                                           |

Element swatches (map legend, materials table) keep `lib/map-colors.ts`, the in-game element colours, shown as a 10px dot next to the name.

### 3.4 Duplicant avatar

One `DuplicantAvatar` component:

1. **Disc** with the blueprint grid (`.av.grid`) in the editor header, plain deep-blue radial in lists. 2px dark outline and a 1px top highlight.
2. **Portrait** from the existing sprite compositor, clipped to the disc. If a layer is missing, draw the layers that exist; initials only for a truly empty appearance, on the same disc. This fixes the `RE`/`RA` fallback look.
3. **Ring** in the current stress level colour (`--lv1..4`), 3px outside the outline. The ring is how stress reads at a glance on Overview and in the roster.

Sizes: 96 (editor header), 44 (Overview crew tile), 40 (roster), 32 (pickers). Hat chip uses the skill-group colour.

### 3.5 shadcn components restyled

| Component                                    | Change                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `card`                                       | Becomes `panel`; `CardHeader` gets `panel-head` styling where a page-level card has a title (`variant="framed"`), plain for nested cards. |
| `button`                                     | Chunky: 2px outline, bottom shadow, `:active` press; `default` teal, `secondary` slate, `outline` well; uppercase heading font at `sm`.   |
| `tabs`                                       | Replace the pill list with the game tab row: icon + uppercase label + count, active `--accent`.                                           |
| `badge`                                      | `chip` variant driven by `--c`; `DlcBadge`, trait and state badges are thin wrappers.                                                     |
| `progress`                                   | `tone` prop sets `--c`; block-masked segments (the `meter` utility).                                                                      |
| `input`, `select`, `textarea`, `input-group` | `well` look: dark inset with 2px outline.                                                                                                 |
| `switch`, `toggle-group`                     | Well trough with a chunky knob; toggle-group items use the tab look.                                                                      |
| `table`                                      | Dark rows with `well` header, 40px rows, selected row `--accent`.                                                                         |
| `sidebar`                                    | `--sidebar` teal-slate, active item filled `--primary` with outline and highlight; footer file card.                                      |
| `avatar`                                     | Ring and grid variants as in 3.4.                                                                                                         |
| `skeleton`, `empty`                          | Skeleton blocks use `--muted` with a slow pulse; `Empty` gets a framed well with a blueprint grid background.                             |

### 3.6 Shell and layout

Sidebar rail with section labels and count badges; header with a mauve title plate (page name), DLC chips, undo/redo, **Download save**. On phones the sidebar becomes a bottom nav of the five most-used pages plus a menu button; DLC chips and undo/redo move into the menu; Download shrinks to an icon. Duplicants: roster panel and editor side by side; on phones the roster becomes a horizontal avatar strip above the editor.

## 4. shadcn blocks and components per page

Use `shadcn view/add` for these; adapt, do not paste.

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

## 5. Implementation plan

### PR 0: Foundation (L). Land first.

Wait for `feat/save-polish` (touches `App.tsx`, `load-states.tsx`, `changes-popover.tsx`) to merge, or keep the `App.tsx` change to the provider and shell wrapper only. Other edits are in files no worker is touching.

Files:

- `apps/web/package.json`, `pnpm-workspace.yaml` (catalog): add `@fontsource/saira-semi-condensed` (500/600/700) and `@fontsource/nunito-sans` (400/600/700); drop Barlow and Chakra Petch; keep `@fontsource-variable/jetbrains-mono`.
- `apps/web/src/index.css`: dark tokens, `--cat-*`/`--lvl-*`, `.panel`/`.panel-head`/`.well`/`.chip`/`.meter` utilities, canvas dot grid, font imports and `@theme inline` mappings, `--radius`. Pin `class="dark"` on `<html>` and remove the theme toggle (see decision 1).
- `apps/web/src/lib/categories.ts` (new): category maps + `catStyle`.
- `apps/web/src/components/dlc-badge.tsx`: rewrite on `CategoryChip` (removes hard-coded palette).
- `apps/web/src/components/common.tsx`: `DuplicantAvatar` v2 (+ `AvatarGroup`), `CategoryChip`, `LevelMeter`, `StatTile`, `IconTile`, `PageHeader`, `ChangedBadge`. Keep `CommitInput`, `NumberField`, `Hint`, `SearchPicker` API-stable. (Split into `components/common/*.tsx` only if the file passes ~350 lines.)
- `apps/web/src/components/ui/`: `card.tsx` (padding/radius tokens), `badge.tsx` (add `chip` variant), `progress.tsx` (`tone` via `--c`), `tabs.tsx` (line variant, icon + count slot), `sidebar.tsx` (rail colours only), `button.tsx` (sizes), `table.tsx` (compact rows, sticky header), add `hover-card.tsx`, `accordion.tsx`, `chart.tsx` if absent. Note `feat/duplicant-traits` adds `ui/alert.tsx`: do not add it here.
- `apps/web/src/components/app-sidebar.tsx`, `site-header.tsx`, `App.tsx` (shell wrapper only): teal-slate rail with chunky active item, mauve title plate, header grouping, phone header with bottom nav, unsaved-edits chip in the file card.
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

Screenshots at 1440 and 390, no hard-coded Tailwind palette colours (`grep -E "(text|bg|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|violet|purple|pink)-[0-9]"` returns nothing), numbers use `tabular-nums`, an `Empty` and a `Skeleton` state exist, `vp check` and e2e pass.

### Caveats

- Fonts and the mauve title bar are the most subjective calls; both are isolated to `index.css` and can be swapped without touching pages.
- Critter-family hues are a starting map; verify contrast (>=4.5:1 for chip text) when tokens are wired.
- Mobile Duplicants layout was inferred from the sidebar/Overview run and CSS (`@4xl/main` grid), not screenshotted for every tab.
