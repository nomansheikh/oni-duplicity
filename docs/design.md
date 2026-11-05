# Duplicity UI design direction

Status: proposal. Audited against `origin/test/e2e-playwright` (c860e56), `beautiful-galaxy.sav`, desktop 1440x900 and phone 390x844, light and dark.
Mockups (static HTML, real fixture data, light and dark, desktop and phone):

- [Duplicants list with open editor](https://claude.ai/artifact/FiZwyRoQVYEUshUX2SKCxf)
- [Overview](https://claude.ai/artifact/PQ16CZ8qdPiXfNgphmfs7D)

## 1. Audit

What already works and should be kept: shadcn `radix-nova` style, `Item`, `Empty`, `InputGroup` with unit add-ons, `Progress`, `ButtonGroup`, `Kbd`; fonts through `--font-heading/--font-sans/--font-mono`; real duplicant portraits from the original sprite sheet; virtualised critter and material tables; lazy-loaded pages.

The "stock" feeling comes from three things: (a) a zero-chroma grey palette in light mode and a single teal accent, (b) every page is the same `Card` with a title, a description and a plain table or form, (c) colour is used for almost nothing except DLC chips and the wildness badge.

### Top 10 problems (ranked)

1. **Neutral grey light theme.** `--background/--card/--muted/--border` are all `oklch(x 0 0)`. Light mode reads as the shadcn default; only the teal primary differs. No surface hierarchy (page vs card vs inset) beyond a 1px border.
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

## 2. Direction: "Colony Control Panel"

A warm, slightly retro lab-console look. Paper-cream surfaces and ink-navy type in light; deep blue-black "viewscreen" in dark. A dark navy sidebar rail in both themes (the one fixed anchor), brass-gold used only for the active nav item, focus and "unsaved" state. Playful, colourful, but organised: one colour per category, applied the same way everywhere (tinted chip, tinted icon tile, tinted meter). Flavour comes from structure (label-maker tags, blueprint dot-grid canvas, readout-style numerals), not from copying game art or logos.

### 2.1 Colour tokens (CSS variables, `apps/web/src/index.css`)

```css
:root {
  color-scheme: light;
  --background: oklch(0.972 0.012 95); /* warm paper */
  --foreground: oklch(0.25 0.045 255); /* ink navy */
  --card: oklch(0.992 0.006 95);
  --card-foreground: var(--foreground);
  --popover: oklch(0.992 0.006 95);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.5 0.11 205); /* oxygen teal */
  --primary-foreground: oklch(0.985 0.01 95);
  --secondary: oklch(0.94 0.016 95);
  --secondary-foreground: oklch(0.28 0.045 255);
  --muted: oklch(0.945 0.013 95);
  --muted-foreground: oklch(0.5 0.03 255);
  --accent: oklch(0.925 0.04 200);
  --accent-foreground: oklch(0.28 0.06 215);
  --destructive: oklch(0.56 0.21 27);
  --border: oklch(0.885 0.016 95);
  --input: oklch(0.86 0.018 95);
  --ring: oklch(0.6 0.12 205);
  --success: oklch(0.58 0.15 150);
  --warning: oklch(0.72 0.15 75);
  --info: oklch(0.58 0.14 245);
  --brass: oklch(0.8 0.145 85); /* active nav, focus pip, unsaved */
  --canvas-dot: oklch(0.25 0.045 255 / 9%);
  --sidebar: oklch(0.255 0.05 255); /* navy rail, both themes */
  --sidebar-foreground: oklch(0.93 0.02 95);
  --sidebar-primary: var(--brass);
  --sidebar-primary-foreground: oklch(0.25 0.05 255);
  --sidebar-accent: oklch(0.32 0.055 255);
  --sidebar-accent-foreground: oklch(0.97 0.01 95);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: var(--brass);
  --chart-1: var(--primary);
  --chart-2: oklch(0.65 0.15 150);
  --chart-3: oklch(0.75 0.15 75);
  --chart-4: oklch(0.6 0.2 25);
  --chart-5: oklch(0.55 0.17 295);
  --radius: 0.5rem;
}
.dark {
  color-scheme: dark;
  --background: oklch(0.19 0.03 255);
  --foreground: oklch(0.95 0.014 95);
  --card: oklch(0.235 0.036 255);
  --popover: oklch(0.255 0.038 255);
  --primary: oklch(0.82 0.12 195);
  --primary-foreground: oklch(0.2 0.04 230);
  --secondary: oklch(0.29 0.04 255);
  --muted: oklch(0.275 0.04 255);
  --muted-foreground: oklch(0.72 0.03 255);
  --accent: oklch(0.31 0.055 225);
  --accent-foreground: oklch(0.95 0.02 200);
  --destructive: oklch(0.7 0.19 22);
  --border: oklch(1 0 0 / 11%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.11 195);
  --success: oklch(0.76 0.16 152);
  --warning: oklch(0.82 0.15 80);
  --info: oklch(0.75 0.13 240);
  --brass: oklch(0.84 0.15 85);
  --canvas-dot: oklch(1 0 0 / 6%);
  --sidebar: oklch(0.15 0.03 255);
  --sidebar-accent: oklch(0.25 0.04 255);
}
```

Surface ladder (light): page `--background`, cards `--card` (+ `shadow-xs`), inset wells `--muted`, sidebar `--sidebar`. In dark each step is ~+0.04 L. Page canvas gets a dot grid: `background-image: radial-gradient(var(--canvas-dot) 1px, transparent 1px); background-size: 20px 20px` on `SidebarInset`.

Category chips use **one token per category** and derive tint/border/text with `color-mix`, so adding a category never means three new Tailwind classes:

```css
.chip {
  /* set --c on the element */
  --c: var(--muted-foreground);
  color: color-mix(in oklab, var(--c) 72%, var(--foreground));
  background: color-mix(in oklab, var(--c) 14%, var(--card));
  border: 1px solid color-mix(in oklab, var(--c) 35%, transparent);
}
```

### 2.2 Category colour map

All values are `--cat-*` tokens defined once for light and once for dark (dark = L +0.1, C -0.02). Light values shown.

| Domain              | Key                                                                                                                 | Token                             | oklch (light)                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DLC**             | Spaced Out!                                                                                                         | `--cat-dlc-spaced`                | 0.55 0.2 295 (violet)                                                                                                                                                                                                                               |
|                     | Frosty Planet                                                                                                       | `--cat-dlc-frosty`                | 0.6 0.14 235 (ice blue)                                                                                                                                                                                                                             |
|                     | Bionic Booster                                                                                                      | `--cat-dlc-bionic`                | 0.68 0.15 70 (amber)                                                                                                                                                                                                                                |
|                     | Prehistoric Planet                                                                                                  | `--cat-dlc-prehistoric`           | 0.62 0.16 130 (lime)                                                                                                                                                                                                                                |
|                     | Aquatic Planet                                                                                                      | `--cat-dlc-aquatic`               | 0.6 0.12 195 (cyan)                                                                                                                                                                                                                                 |
|                     | Base game                                                                                                           |                                   | `--muted-foreground`                                                                                                                                                                                                                                |
| **Trait category**  | Good                                                                                                                | `--cat-trait-good`                | 0.6 0.15 150 (green)                                                                                                                                                                                                                                |
|                     | Bad                                                                                                                 | `--cat-trait-bad`                 | 0.58 0.2 27 (red)                                                                                                                                                                                                                                   |
|                     | Genetic / congenital                                                                                                | `--cat-trait-gene`                | 0.55 0.17 270 (indigo)                                                                                                                                                                                                                              |
|                     | Stress reaction                                                                                                     | `--cat-trait-stress`              | 0.66 0.16 50 (orange)                                                                                                                                                                                                                               |
|                     | Joy reaction                                                                                                        | `--cat-trait-joy`                 | 0.64 0.19 350 (pink)                                                                                                                                                                                                                                |
| **Element state**   | Solid                                                                                                               | `--cat-solid`                     | 0.6 0.1 60 (clay)                                                                                                                                                                                                                                   |
|                     | Liquid                                                                                                              | `--cat-liquid`                    | 0.6 0.14 245 (blue)                                                                                                                                                                                                                                 |
|                     | Gas                                                                                                                 | `--cat-gas`                       | 0.7 0.12 175 (mint)                                                                                                                                                                                                                                 |
|                     | Vacuum                                                                                                              | `--cat-vacuum`                    | 0.5 0.02 255 (slate)                                                                                                                                                                                                                                |
| **Geyser class**    | Water (clean / polluted / brine)                                                                                    | `--cat-geyser-water`              | 0.62 0.13 235                                                                                                                                                                                                                                       |
|                     | Steam / hot vents                                                                                                   | `--cat-geyser-steam`              | 0.68 0.15 35                                                                                                                                                                                                                                        |
|                     | Gas (CO2, H2, O2, chlorine, natural gas)                                                                            | `--cat-geyser-gas`                | 0.7 0.12 175                                                                                                                                                                                                                                        |
|                     | Volcano (magma, minor)                                                                                              | `--cat-geyser-volcano`            | 0.58 0.21 25                                                                                                                                                                                                                                        |
|                     | Metal volcano (iron, copper, gold, ...)                                                                             | `--cat-geyser-metal`              | 0.62 0.12 55 (copper)                                                                                                                                                                                                                               |
|                     | Oil / petroleum                                                                                                     | `--cat-geyser-oil`                | 0.45 0.07 60 (tar)                                                                                                                                                                                                                                  |
| **Critter family**  | 13 families                                                                                                         | `--cat-critter-1..13`             | fixed L 0.62, C 0.14, hue stepped by 27.7 deg, assigned alphabetically so a family keeps its colour (Hatch 55, Drecko 130, Pacu 235, Puft 175, Slickster 25, Shine Bug 85, Morb 295, Pip 350, Moo 270, Glom 150, Floxy 205, Crab 40, Divergent 320) |
| **Stress**          | Calm (<25%)                                                                                                         | `--lvl-1` = `--success`           |                                                                                                                                                                                                                                                     |
|                     | Uneasy (25-50%)                                                                                                     | `--lvl-2`                         | 0.78 0.15 110 (lime-yellow)                                                                                                                                                                                                                         |
|                     | Stressed (50-80%)                                                                                                   | `--lvl-3` = `--warning`→orange    | 0.7 0.16 55                                                                                                                                                                                                                                         |
|                     | Breaking (>=80%)                                                                                                    | `--lvl-4` = `--destructive`       |                                                                                                                                                                                                                                                     |
| **Health / vitals** | Healthy (>=60) / Hurt (25-60) / Critical (<25)                                                                      | `--lvl-1` / `--lvl-3` / `--lvl-4` |                                                                                                                                                                                                                                                     |
| **Research**        | Researched / not yet                                                                                                | `--primary` / `--muted`           |                                                                                                                                                                                                                                                     |
| **Skill group**     | Mining, Building, Farming, Ranching, Research, Atomic, Cooking, Arts, Hauling, Suits, Technicals, Medical, Piloting | `--cat-skill-1..13`               | same stepped-hue rule as critters, offset by 14 deg                                                                                                                                                                                                 |

Mapping lives in one file (`apps/web/src/lib/categories.ts`) exporting `catStyle(domain, key): CSSProperties` (`{ '--c': 'var(--cat-...)' }`). `DlcBadge`, `StateBadge`, `FamilyChip`, `TraitCard`, `GeyserTypeChip`, `LevelMeter` all read from it.

Element swatches (map legend, materials table) keep using `lib/map-colors.ts` (the in-game element colours), shown as a 10px dot next to the name.

### 2.3 Fonts

Google Fonts, installed through `@fontsource` (already the project pattern) and mapped to the existing variables:

- **`--font-heading`: Bricolage Grotesque** (variable, 600-800). A quirky grotesque with ink-trap-like details and optical sizing. Gives playful-but-not-childish headlines and the big KPI numerals. Replaces Chakra Petch, whose squared "gaming HUD" shapes read generic and only ship 500/600 here.
- **`--font-sans`: Hanken Grotesk** (variable, 400-700). Clean, slightly warm, excellent at 12-14px in dense tables and with tabular figures. Replaces Barlow (condensed, tight at small sizes in tables).
- **`--font-mono`: Martian Mono** (variable, 400-600, width axis). Wide, "instrument readout" character; used for numeric readouts (kcal, kg, cycles, coordinates), the Raw tree, `Kbd`. JetBrains Mono is kept only as the fallback in the stack.

Numerals: `font-variant-numeric: tabular-nums` on all numeric cells; KPI figures in Bricolage 700 at 30/36px.

Scale: 12 / 13 / 14 (body) / 16 / 20 / 28 / 36. Headings `tracking-tight`, uppercase 11px `tracking-[0.08em]` section labels in `--muted-foreground` (the "label-maker" tags above cards).

### 2.4 Radius, density, spacing

- `--radius: 0.5rem` (was 0.625). Cards `rounded-xl` (0.7rem), inputs/buttons `rounded-md`, chips/avatars full. Slightly crisper reads more "instrument" than "soft SaaS".
- 4px base. Page gutter 24px desktop, 16px mobile. Card padding 16px (20px for hero cards). Card gap 16px. Form row gap 12px. One value for each; no per-page overrides.
- **Compact density**: table rows 40px (virtualised row estimate updates), `Button` size `sm` as default in toolbars, `Input` height 36px, `Item size="sm"`. Row hover tint `--muted/60`, selected row `--accent` with a `--primary` 35% outline.
- Max content width 1280px centred on wide screens for forms and card pages; tables and map are full width.

### 2.5 Icons

Keep **Lucide** (already installed, shadcn standard). Treatment: icon sits in a 28px `rounded-md` tile tinted by its category (`.chip` pattern, no border), stroke 1.75. Nav icons are plain in the rail with the active item getting a brass 3px left bar. No second icon set. ONI flavour comes from element colour dots and the duplicant portraits, not from game icons.

### 2.6 Duplicant avatar

`DuplicantAvatar` becomes a single component with three layers:

1. **Disc** tinted by the duplicant's top interest group (`--cat-skill-*`), `radial-gradient` highlight, 1px inner border.
2. **Portrait** (existing sprite composite) clipped to the disc; if a layer is missing, draw what exists on top of the disc instead of falling back to initials. Initials remain only for a truly empty appearance, using the same disc so it looks intentional.
3. **Ring + pip**: 2px ring in the current stress level colour (`--lvl-*`), and a 10px pip (bottom-right) showing the hat/skill group icon in the editor header and list at >=40px.

Sizes: 32 (compact rows, pickers), 40 (list), 72 (editor header, with 4px ring), 28 (breadcrumb/sidebar chips). `AvatarGroup` (overlap -8px) for colony strips on Overview.

### 2.7 Shell

- **Sidebar** (`sidebar-07`-style, collapsible to icons; `variant="inset"` retained): navy `--sidebar` in both themes, section labels in 11px caps, count badges as `SidebarMenuBadge`, brass left bar on active. Footer: file chip with `Avatar`-style icon tile, `unsaved edits` count in brass.
- **Header** (`sidebar-16` sticky site header): `SidebarTrigger`, `Breadcrumb` (page title as `h1` in Bricolage), right group: DLC chips collapse into a `HoverCard` "+5 DLC" below `md`, `ButtonGroup` undo/redo, primary **Download save** `Button` with `Kbd` hint, theme toggle and preferences in a `DropdownMenu`. Phone: breadcrumb truncates to page title; undo/redo and download stay.
- **Page frame**: new `PageHeader` (eyebrow label, title, description, actions) so every page starts the same way, replacing the repeated `CardHeader` title/description on top-level cards.

### 2.8 Shared components (new or reworked)

`PageHeader`, `StatTile` (label-maker tag, big numeral, optional trend/Progress), `LevelMeter` (thresholded `Progress` using `--lvl-*`), `CategoryChip` (+ `DlcBadge`, `StateBadge`, `FamilyChip`, `TraitChip`), `IconTile`, `DuplicantAvatar` v2, `DataTable` shell (dense rows, sticky header, `Empty` for no results, `Skeleton` rows), `FilterBar` (`ToggleGroup` with counts + `InputGroup` search + `Kbd` "/"), `ChangedBadge` ("edited" dot for fields differing from the loaded save), `LoadingCard`.

## 3. shadcn blocks and components per page

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

## 4. Implementation plan

### PR 0: Foundation (L). Land first.

Wait for `feat/save-polish` (touches `App.tsx`, `load-states.tsx`, `changes-popover.tsx`) to merge, or keep the `App.tsx` change to the provider and shell wrapper only. Other edits are in files no worker is touching.

Files:

- `apps/web/package.json`, `pnpm-workspace.yaml` (catalog): add `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/hanken-grotesk`, `@fontsource-variable/martian-mono`; drop Barlow/Chakra Petch/JetBrains (or keep JetBrains as fallback).
- `apps/web/src/index.css`: tokens (light/dark), `--cat-*`/`--lvl-*`, `.chip`, canvas dot grid, font imports and `@theme inline` mappings (`--color-success/warning/info/brass`), `--radius`.
- `apps/web/src/lib/categories.ts` (new): category maps + `catStyle`.
- `apps/web/src/components/dlc-badge.tsx`: rewrite on `CategoryChip` (removes hard-coded palette).
- `apps/web/src/components/common.tsx`: `DuplicantAvatar` v2 (+ `AvatarGroup`), `CategoryChip`, `LevelMeter`, `StatTile`, `IconTile`, `PageHeader`, `ChangedBadge`. Keep `CommitInput`, `NumberField`, `Hint`, `SearchPicker` API-stable. (Split into `components/common/*.tsx` only if the file passes ~350 lines.)
- `apps/web/src/components/ui/`: `card.tsx` (padding/radius tokens), `badge.tsx` (add `chip` variant), `progress.tsx` (`tone` via `--c`), `tabs.tsx` (line variant, icon + count slot), `sidebar.tsx` (rail colours only), `button.tsx` (sizes), `table.tsx` (compact rows, sticky header), add `hover-card.tsx`, `accordion.tsx`, `chart.tsx` if absent. Note `feat/duplicant-traits` adds `ui/alert.tsx`: do not add it here.
- `apps/web/src/components/app-sidebar.tsx`, `site-header.tsx`, `App.tsx` (shell wrapper only): navy rail, header grouping, mobile header, unsaved-edits chip in the footer.
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

Light and dark screenshots at 1440 and 390, no hard-coded Tailwind palette colours (`grep -E "(text|bg|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|violet|purple|pink)-[0-9]"` returns nothing), numbers use `tabular-nums`, an `Empty` and a `Skeleton` state exist, `vp check` and e2e pass.

### Caveats

- Fonts and the dark-sidebar choice are the most subjective calls; both are isolated to `index.css` and can be swapped without touching pages.
- Critter-family hues are a starting map; verify contrast (>=4.5:1 for chip text) when tokens are wired.
- Mobile Duplicants layout was inferred from the sidebar/Overview run and CSS (`@4xl/main` grid), not screenshotted for every tab.
