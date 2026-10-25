---
name: wechat-emojis-brand-guidelines
description: "Design, build, or revise the wechat-emojis GitHub Pages site. Use for the project landing page, the emoji browser, usage docs, and any new page that must read as the same product. Covers brand, reader jobs, composition, tokens, CSS primitives, motion, copy, and checks."
---

# Design the wechat-emojis site

This file is the design authority for the site published at `https://xxk8.github.io/wechat-emojis/`. It is written for an agent or a person who has the repository but has not seen earlier decisions. Read it before writing markup or CSS, then build with the published primitives in `site/brand.css` instead of inventing a parallel system.

## What this project is

`wechat-emojis` is an unofficial, MIT-licensed package of the 109 built-in WeChat emoji: 75 faces, 10 gestures, 4 animals, 7 blessing emoji, and 13 other objects. Every image is a 100x100 PNG on a transparent background, and the whole set is 690.3 KB. The package also ships a typed API for finding emoji by name, category, and keyword.

The site is not a SaaS marketing page. It is a working emoji catalogue and a short, honest manual. It must let a visitor:

1. See that the set is complete, current, and visually coherent.
2. Find one emoji by name, mood, or category and copy its name or image.
3. Understand how to install and use the package without leaving the page.

## Brand

**Idea: the emoji theatre.** WeChat emoji are small, theatrical, and emotionally blunt. The site puts them on a dark stage, lights them like objects in a vitrine, and lets a few of them perform. The interface around them is quiet and editorial, so the yellow faces carry the personality.

**Personality:** knowing, warm, a little theatrical, never childish. The site can smile at itself, but it does not use jokes, mascots, confetti, or exclamation-mark copy as a substitute for information.

**Positioning line:** 109 个微信内置表情，一处收好。

**The three brand colours**

| Token | Value | Role |
| --- | --- | --- |
| `--we-ink` | `#0d0f0e` | Stage and primary dark field |
| `--we-green` | `#07c160` | WeChat green. Action, live state, selection |
| `--we-emoji` | `#f7cf46` | The yellow sampled from the faces. Emphasis, marks, the spotlight |

Green and yellow are the only chromatic colours on the dark stage. A third colour is allowed only when it comes from an actual emoji image. Never add purple-blue gradients, glassmorphism, neon glows, or rainbow accents.

The stage may use one soft, static radial light behind the featured emoji and a vignette at the page edges. It exists to make the emoji read as lit objects, not to decorate the page. Do not turn it into a full-page gradient field, a gradient text treatment, or a coloured glow around controls.

**Typography.** Display type is a serif, because the emoji set is a piece of internet culture with a long memory and the serif gives it a poster voice. UI and body type is a grotesque. Chinese text falls back to PingFang SC; Latin display falls back to a system serif. Numerals in evidence use tabular figures.

## Reader and task

The first reader is a developer who has seen the package name or a shared emoji and wants to know whether it is complete, trustworthy, and easy to use. The second reader is a designer or writer who just wants to look at the set and grab a file.

The reader's job, in order:

- **Recognize:** what is this, how many, what does it look like?
- **Verify:** is my favourite emoji here, and is the API real?
- **Use:** copy a name, copy a path, or install the package.
- **Audit:** what is the licence, what is unofficial, what changed?

Two reading speeds must both work:

- **Executive path:** the hero, the count, the wall, and the section headings tell the whole story.
- **Audit path:** the category ledger, the API table, the install commands, the licence and the caveats stay exact.

## Page architecture

One page, in this order. Each section answers a new question; do not add a section that repeats an answer.

1. **Stage (hero).** Identity, the promise, the count, and a live orbit of emoji around a single featured face. One primary action: start browsing. One secondary: read the API.
2. **Wall (catalogue).** The complete set, grouped by the five real categories, with a search field and category filters. This is the focal working object of the page and must be usable with a keyboard.
3. **Copy (inspect).** Selecting an emoji opens a small inspector showing the large image, the Chinese name, the category, copy actions for the name and the path, and a download link for the PNG. Never navigate away. On screens narrower than 1120 px the inspector is a bottom dock with a close control.
4. **Use (install).** npm install, the asset copy step, and three runnable snippets: import, search, and React. Commands are copyable.
5. **Evidence (ledger).** A real table of category counts and byte sizes, the total, the dimensions, the licence, and the unofficial-status caveat.
6. **Footer.** Repository, npm, issues, licence, and the reminder that the artwork belongs to Tencent.

## Composition

The page is a field, not a stack of cards. Alternate dense evidence with quiet space:

- The hero is a full-viewport dark stage with one focal face and orbiting satellites. The headline sits left, the orbit right, on one shared baseline grid. A small "换一个" control swaps the featured face without leaving the stage.
- The wall is a dark continuation of the stage, but denser and flatter. A sticky toolbar keeps search and filters available.
- The "Use" section turns the page to warm paper. This is the only large light surface. It marks the shift from looking to doing, and it makes code blocks legible.
- The ledger sits on paper too, as a plain full-width table, then the footer returns to ink.

**Geometry.** The wall is a responsive grid of equal cells, because the emoji are true peers. Category headings break the grid into five runs. The hero orbit is the one place with an asymmetric, organic geometry. Do not give every section the same silhouette.

**Avoid:** a centred generic hero, a uniform card grid for features, three identical metric boxes, pill-shaped metadata, cards inside cards, and section numbers used as decoration.

## Observable decisions

These are the rules a reviewer can check by looking at the rendered page.

1. Every emoji image renders from `assets/<category>/<name>.png` with the original Chinese filename. The wall shows all 109 with no placeholder tiles.
2. The count in the hero, the wall toolbar, and the ledger all derive from the same data and read 109.
3. The category rail jumps to a category and clears any active filter, so the destination is always visible.
4. Search filters by Chinese name substring and category. An empty result states the query and offers a reset.
5. A category filter shows its own count and an `aria-pressed` state; "全部" is the default.
6. Selecting a tile opens the inspector and announces the change through a polite live region. On narrow screens it slides up as a dock with a close control and Escape support.
7. Copy actions confirm in place, with a text change, not a toast that covers content.
8. The hero's orbit pauses when the pointer is over it, when focus is within it, when the tab is hidden, when the page is scrolling, when it leaves the viewport, and when the reader presses "暂停动效". Under `prefers-reduced-motion: reduce` the rotation is removed and the toggle is hidden.
9. The "换一个" control swaps the featured emoji and updates a polite live region with its name. It never navigates.
10. The page has one `h1`, ordered headings, a skip link, landmarks, and visible focus on every control.
11. Text and essential UI meet WCAG AA on their actual background. The measured pairs are: `--we-muted` on `--we-ink` 8.66:1, `--we-green` on `--we-ink` 8.07:1, `--we-emoji` on `--we-ink` 12.79:1, `--we-paper-muted` on `--we-paper` 5.47:1, and `--we-paper-text` on `--we-paper` 15.57:1.
12. No horizontal overflow at 320 px. The toolbar wraps before it shrinks. Code blocks scroll locally rather than widening the page.
13. The install and API sections use the real commands and signatures from this repository, not invented ones.
14. The ledger's numbers match a fresh `du`/count of `assets/`.

## Copy

Write in Chinese for the page. Sentence case for English headings and labels.

- Lead with the concrete noun and the number: "109 个表情", "690 KB", "5 个分类".
- Say what a control does, not how it feels: "复制名称", not "一键获取".
- Keep one claim per sentence. Do not call the set "官方", "完整覆盖" without the caveat that it is unofficial, or "高清" when the source is 100x100.
- Honest caveats belong near the claim they qualify: unofficial project, artwork copyright Tencent, non-commercial use.
- No em dashes in page copy. No all-caps eyebrows. No "赋能", "一站式", "极致", "颠覆".
- Microcopy for empty and error states is plain: "没有找到「xxx」", "复制失败，请手动选择".

## Visual tokens

All page CSS reads these tokens. Do not redeclare or alias them.

| Token | Value | Notes |
| --- | --- | --- |
| `--we-ink` | `#0d0f0e` | Stage |
| `--we-ink-2` | `#141816` | Raised dark surface |
| `--we-ink-3` | `#1c211e` | Hairline / hover on dark |
| `--we-paper` | `#f4f1e8` | Warm paper |
| `--we-paper-2` | `#e9e4d7` | Paper rule / hover |
| `--we-green` | `#07c160` | WeChat green |
| `--we-green-ink` | `#04361c` | Green on light, for focus fills |
| `--we-emoji` | `#f7cf46` | Sampled face yellow |
| `--we-text` | `#f5f3ec` | Text on ink |
| `--we-muted` | `#a8b0aa` | Secondary text on ink |
| `--we-paper-text` | `#161a17` | Text on paper |
| `--we-paper-muted` | `#5c635d` | Secondary text on paper |
| `--we-rule` | `rgba(245,243,236,.14)` | Hairline on ink |
| `--we-rule-paper` | `rgba(22,26,23,.16)` | Hairline on paper |
| `--we-radius` | `10px` | One radius for interactive surfaces |
| `--we-space-1..12` | `4,8,12,16,24,32,48,64,96,128,160,200px` | Spacing scale |
| `--we-font-display` | `"Songti SC", "Noto Serif SC", "Source Han Serif SC", Georgia, serif` | Poster voice |
| `--we-font-sans` | `"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif` | UI and body |
| `--we-font-mono` | `"SFMono-Regular", "JetBrains Mono", Consolas, monospace` | Code, paths, counts |
| `--we-ease` | `cubic-bezier(.22,.61,.36,1)` | One easing |

Type roles, used consistently:

| Role | Size / leading | Use |
| --- | --- | --- |
| `we-display` | `clamp(3.2rem, 9vw, 8.5rem)` / `.92` | The single hero statement |
| `we-title` | `clamp(2rem, 4.5vw, 3.5rem)` / `1.05` | Section titles |
| `we-heading` | `1.25rem` / `1.4` | Nested headings, category names |
| `we-lede` | `1.125rem` / `1.7` | One orientation paragraph |
| `we-body` | `1rem` / `1.7` | Reading |
| `we-label` | `.8125rem` / `1.3`, letter-spacing `.02em` | Controls and small labels |
| `we-mono` | `.875rem` / `1.6` | Counts, paths, code |

## CSS primitives

`site/brand.css` is the published vocabulary. Page markup uses these class names; page-specific layout uses `we-*` names that are not in this list only for geometry.

Shell and layout: `we-page`, `we-skip`, `we-header`, `we-nav`, `we-main`, `we-section`, `we-wrap`, `we-grid`, `we-split`, `we-stack`, `we-cluster`, `we-band`.

Type: `we-display`, `we-title`, `we-heading`, `we-lede`, `we-body`, `we-label`, `we-mono`, `we-numeric`, `we-muted`, `we-caption`.

Controls: `we-button`, `we-button--primary`, `we-button--quiet`, `we-field`, `we-input`, `we-chip`, `we-chip[aria-pressed]`, `we-select`.

Emoji: `we-emoji`, `we-emoji-tile`, `we-emoji-name`, `we-orbit`, `we-orbit-item`, `we-featured`.

Evidence: `we-table`, `we-table-wrap`, `we-ledger`, `we-stat`, `we-stats`, `we-note`, `we-code`, `we-copy`.

Inspector: `we-inspector`, `we-inspector-media`, `we-inspector-meta`, `we-inspector-actions`.

Rules for custom CSS:

- Custom selectors start with `we-custom-` or `we-viz-`.
- Never restyle a published primitive's layout, type, surface, border, or control height from page CSS.
- Every custom `font-weight` uses a published token; do not invent weights.
- Custom gaps come from `--we-space-*`; each gap has one owner.

## Motion

Motion exists to explain state, not to decorate the scroll.

- **Hero orbit:** slow, continuous rotation of the ring; the inner faces counter-rotate so they stay upright. It is the one ambient motion. It pauses on hover, on focus within, when the document is hidden, when the orbit leaves the viewport, while the page is scrolling, and when the reader presses "暂停动效". That control is a real toggle with `aria-pressed`, and it is hidden when the reader prefers reduced motion. The wall's images are decoded in idle-time chunks after load, so the first scroll does not pay for decoding.
- **Tile selection:** a 160 ms scale and border change, plus the inspector updating. No page transition.
- **Featured swap:** a 200 ms opacity and scale crossfade when the reader asks for another face. No auto-rotation of the featured content. The wall's "随机一个" action picks a random emoji, clears filters, selects its tile, and scrolls it to the middle of the viewport.
- **Copy confirmation:** the button's own text changes for 1.6 s. No toast, no confetti.
- **Reveal:** none. The page must be complete without scroll animation.
- **Reduced motion:** all transforms, rotations, transitions, and smooth scrolling are disabled; the orbit becomes a static arc of faces.

Never add auto-scrolling marquees, typed cursors, parallax, bouncing, sound, or cursor trails.

## Accessibility

- One `h1`. Sections use `h2`, nested blocks use `h3`.
- Skip link to `#main`.
- The emoji wall is a list of buttons. Each button's accessible name is the emoji name plus its category.
- The inspector is a labelled region; updates go through `aria-live="polite"`.
- The featured emoji's name is a polite live region when "换一个" is used.
- The search field has a visible label, not just a placeholder.
- Filters are toggle buttons with `aria-pressed`; the selected filter is also marked visually with a border and a count.
- Copy buttons announce success in their own label and are keyboard reachable.
- Focus is visible on ink and paper, using a 2 px `--we-emoji` ring on dark and `--we-green-ink` on paper.
- Colour is never the only signal: counts, labels, and borders accompany it.
- The page works with JavaScript disabled for reading: the wall is rendered in the HTML for the first category run, and a `<noscript>` note explains that search and copy need JavaScript. Prefer server-rendered markup for the whole wall if the build allows it; otherwise render the full wall at build time with a small script and keep the noscript path honest.

## Responsive behavior

- **>= 1120 px:** hero is a two-column split; wall is 8 columns; the inspector is a sticky card beside the wall; install is a 2-column split.
- **900–1119 px:** hero stays a two-column split with a smaller orbit; wall is 6 columns; the inspector becomes a bottom dock opened by selecting a tile, with a close control and Escape support; install stacks its code columns.
- **720–899 px:** hero stacks with the orbit below the copy; wall is 6 columns; the toolbar is no longer sticky so it cannot overlap the dock.
- **< 720 px:** wall is 4 columns; toolbar wraps; the orbit keeps four inner satellites; code blocks scroll locally; type steps down but never below 14 px for controls.
- **320 px:** no horizontal page scroll. Long names wrap inside the tile; paths scroll in their own code block.
- Use `min-width: 0` on grid and flex children. Reflow before shrinking.

## Checks

Run these before shipping. They are mechanical and must pass.

1. `node scripts/build-site.ts` regenerates `index.html` from `site/index.template.html`, `site/app.ts`, and `src/index.ts`.
2. `node scripts/check-site.ts` verifies: every emoji in `src/index.ts` has a file, every category count matches the ledger, the page references no missing asset, the wall's data matches the source list, and no external asset is loaded.
3. Render `index.html` at 1440x900, 1024x768, 390x844, and 320x700. Confirm no horizontal overflow, the orbit is visible and paused under reduced motion, and the first viewport states the count.
4. Keyboard pass: skip link, search, each filter, the first and last tile, the inspector, each copy button, the featured swap, and each nav link.
5. Reduced-motion pass: no rotation, no transitions, the page still reads.
6. Contrast spot check: `--we-muted` on `--we-ink`, `--we-green` on `--we-ink`, `--we-paper-muted` on `--we-paper`.
7. Copy pass: no em dash, no all-caps eyebrow, no "官方" claim, the unofficial caveat appears before the footer.

## When this file changes

Every accepted correction lands in the narrowest layer that can enforce it:

- Judgment, copy, and composition go here, as an observable rule.
- Repeatable mechanics go into `site/brand.css` as a primitive.
- Mechanical failures become assertions in `scripts/check-site.ts`.

Do not hand-tune one page around a missing rule. Fix the guidance, then re-check the page.
