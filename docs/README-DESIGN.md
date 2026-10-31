# Profile README — design system

The visual system behind [`README.md`](../README.md). Read this before editing.

## Concept

**Orbit.** Three ideas — *interface*, *system*, *product* — held in relation around one precise core. The motif stands for connection and engineering. It appears in three places:

- **Hero:** the HARINDA wordmark beside a labelled orbital diagram.
- **Wordmark:** each Λ has a node in place of a crossbar; the final one is electric blue.
- **Footer:** the monogram, an H whose crossbar is an orbit that passes *behind* both stems.

## Files

| File | Role |
| --- | --- |
| `scripts/build-assets.mjs` | **Source of truth.** Zero-dependency generator for every SVG below. |
| `assets/hero.svg` / `hero-dark.svg` | Hero card, light / dark theme. |
| `assets/footer.svg` / `footer-dark.svg` | Monogram footer, light / dark theme (transparent background). |
| `assets/icon-*.svg` | Four focus-area icons. A single version works on both themes. |

Don't hand-edit the SVGs. Change the script, then run:

```sh
node scripts/build-assets.mjs
```

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Electric | `#3D7BFF` | Primary accent: wordmark node, meta marker, monogram orbit, "system" node |
| Violet | `#8C7BFF` | Secondary accent: the moving node and icon nodes only |
| Icon blue | `#5B7CFA` | Icon strokes (mid-luminance, readable on white and `#0d1117`) |
| Night → Midnight | `#080B12` → `#0D1322` | Dark hero canvas gradient |
| Paper → Mist | `#FBFBFD` → `#EEF1F7` | Light hero canvas gradient |
| Ink (dark theme) | `#EEF1F7` | Wordmark and headline on dark |
| Ink (light theme) | `#0B0F17` | Wordmark and headline on light |
| Muted | `#8A94A7` / `#566074` | Secondary text, dark / light |
| Border | `#1C2333` / `#DCE1EA` | 1px hero frame, dark / light |

Accents are kept to well under 5% of any composition. Glows are radial gradients at 10–24% opacity. There is no neon and no glassmorphism.

## Typography

| Level | Spec |
| --- | --- |
| Wordmark | Custom monoline paths: cap height 116, stroke 14, tracking 27, flat clipped terminals. No font dependency. |
| Headline | System sans, 34 / 500, tracking −0.4 |
| Subline | System sans, 22 / 400, muted |
| Meta / labels | System mono, 13–14, tracking 1.6–2.4, uppercase, muted |

Font stacks (images can't load web fonts on GitHub):

- Sans: `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`
- Mono: `ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace`

In the README, hierarchy is `###` headings with an editorial index (`01 · About`). `###` is used because `##` draws a rule under the heading.

## Grid, spacing, strokes

- **Hero:** `viewBox="0 0 1200 560"`, 80px side margins, 40px background grid, 28px corner radius, 1px inset border.
- **Footer:** `viewBox="0 0 1200 180"`, hairlines from x=120 to 1080 that fade toward the outside.
- **Icons:** `viewBox="0 0 48 48"`, 2.5 stroke, round joins, one violet node each. Displayed at 32px.
- **Spacing scale:** 8 / 16 / 24 / 40 / 80. Sections are separated by a single `<br>` plus the heading's own margin.
- **Strokes:** hairlines at 1–1.25px in 14–50% opacity of the theme line colour. Solid strokes are reserved for the wordmark and monogram.

## Light and dark themes

GitHub swaps images with `<picture>` and `<source media="(prefers-color-scheme: dark)">`, following the viewer's GitHub theme. The plain `<img>` (light version) is the fallback. Icons use one version with mid-luminance colours that work on both themes.

## Motion

- The hero orbits draw in once (1.8s, ease-out). One violet node orbits slowly (48s per lap in the hero, 36s in the footer).
- Text, the wordmark and the monogram never animate, and nothing starts hidden. With no animation, the SVG shows its complete final state.
- `@media (prefers-reduced-motion: reduce)` turns off all motion and hides the moving node.
- Motion uses CSS `offset-path` and `stroke-dashoffset` inside the SVG. Browsers that don't support it show the static composition.

## Accessibility

- Every essential message lives in Markdown text, not in images. Hero text scales down to about 29% on phones, so it's treated as decoration.
- Hero and footer images have descriptive `alt` text. Icons use `alt=""` because each sits beside its text label.
- Text contrast: Ink on canvas is above 15:1 in both themes. Muted text is about 6:1 on dark and 6.5:1 on light.
- Meaning is never carried by colour alone.

## Editing guide

- **Headline / tagline:** edit `hero()` in the script, then rebuild. Also update the hero `alt` text and the bold first line of *About* in `README.md`.
- **Orbit labels:** the `pts` array in `orbital()`.
- **Featured projects:** in `README.md` under *04 · Selected work*, uncomment the template and fill in **public** repositories only. Private repos 404 for visitors.
- **Contact links:** the line under *05 · Connect*. Keep `&nbsp;` between a label and its handle so they don't split across lines on mobile.
- **GitHub stats:** left out on purpose. GitHub already shows the contribution graph on the profile, and third-party stat cards add visual noise and rate-limit failures. If you want one later, add a single card styled to match this palette and give it alt text.
