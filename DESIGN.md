# Tamil Imposter: design guide

Read this before every change to the game, including small ones. If a change needs something this file doesn't cover, follow the closest existing pattern and add it here in the same commit.

## What the game is

Tamil Imposter is a pass-the-phone party game for a group in one room. Everyone gets the same secret Tamil word except the imposter, who gets a hint. One phone travels around the group, and nobody joins from their own device. It's a static site (plain HTML, CSS and JS, no build step) hosted on GitHub Pages.

**Main platform: phones.** Design at 375px first, then check 320px and 390px. Desktop only needs to look reasonable: the content column is capped at 460px and centred.

## Language rules

- **The whole interface is in English.** That covers buttons, titles, instructions and messages.
- **Only the game content is in Tamil:** the secret words, the imposter hints and the category names.
- **Every Tamil word, hint and category name has its Thanglish right below it** (how a Tamilian would type it in English letters, like "Yaanai", not a formal transliteration). If a custom word has no Thanglish, the line is hidden, never left empty.
- **The secret word stays on one line.** `.secret` and `.hint-word` use `white-space: nowrap`, and `fitText()` / `fitAll()` in app.js shrink long words to fit (minimum 16px). Any new place that shows a word must use the same pattern.

## Visual direction: painted banner on turmeric

The look borrows from Tamil street visuals: hand-painted cinema banners, kolam dot grids, turmeric, kumkum and banana leaf. The style is flat colours, thick ink outlines and hard offset shadows. There are no gradients for decoration and no soft drop shadows.

**One loud element:** the word reveal banner (`.banner.reveal`), which is big, outlined, has a hard shadow and pops in. Everything else stays quiet so the reveal lands. Don't add a second loud element.

### Colour tokens (defined in `:root` in style.css)

| Token | Hex | Use |
|---|---|---|
| `--turmeric` | `#F2B23A` | Page background, text on ink buttons and selected chips |
| `--turmeric-deep` | `#E09A1F` | Darker turmeric accents |
| `--ink` | `#3A0B14` | Text, outlines, primary buttons, selected chips (maroon) |
| `--ink-soft` | `#6E3A2C` | Secondary text, placeholders, dashed outlines |
| `--kumkum` | `#C8102E` | The imposter card, the "imposter escaped" result, errors, offset shadows on primary buttons and headings |
| `--leaf` | `#1E6B3A` | The "imposter caught" result only |
| `--paper` | `#FFF9EE` | Panels, cards, text on kumkum |
| `--line` | `rgba(58,11,20,.14)` | Dividers and quiet borders |

Always use the tokens and never hard-code new hex values. A new colour needs a reason tied to the subject and a new row in this table.

### Background

Turmeric with a kolam dot grid: `radial-gradient` dots at 22px spacing, fixed. Don't add other textures.

### Typography

- **Display:** `"Baloo Thambi 2"` (`--display`), weights 700 and 800. Use it for headings, the secret word, player names, the timer, buttons and chips. It handles Tamil and Latin.
- **Body:** `"Hind Madurai"` (`--body`), weights 400 and 600. Use it for sentences, labels and Thanglish sub-lines on chips.
- Both are loaded from Google Fonts in index.html. Don't add a third family.
- Type scale is 1.25 (`--t-sm` .875rem, `--t-md` 1rem, `--t-lg` 1.25rem, `--t-xl` 1.563rem, `--t-2xl` 2.441rem, `--t-3xl` 3.815rem). Pick from the scale and don't invent sizes. The secret word may use `clamp()` and `fitText()`.
- Headings use sentence case. No all-caps labels, no small eyebrow labels above headings, and no single highlighted word inside a heading.
- The banner text treatment (`text-shadow: 3px 3px 0 var(--kumkum)`) is only for the "Tamil Imposter" title and the player name on the pass screen.

### Shapes and depth

- Panels (`.panel`) have a paper background, a 2px ink border and an 18–22px radius.
- The reveal banner (`.banner`) has a 3px ink border, a 28px radius and `6px 6px 0 var(--ink)` hard shadow.
- Primary buttons get a `4px 4px 0 var(--kumkum)` hard shadow. On press they translate into the shadow.
- Chips are pills (999px radius) with a 2px ink border. Selected chips are filled ink with turmeric text.
- Dashed borders mean "add something" or "not ready yet" (Add player, + New category, a custom list with under 2 words).

## Layout and mobile rules

- Single column, max-width 460px, 16px side padding. The page must never scroll sideways at 320px.
- **The main action sits in the sticky `.actions` bar at the bottom of every screen**, within thumb reach. There's one primary button per screen, and an optional ghost button next to or under it.
- Tap targets are at least 44px, and main buttons are 56–60px tall.
- Respect the notch and home bar with `env(safe-area-inset-*)`.
- Setup screen order: title, Players, Categories (Select all / Deselect all at the top right), Imposters and hint switch, "How to play" link, then the sticky Start game.
- Players are numbered in the order the phone is passed.
- Start game is disabled, with a short kumkum note above it, until at least one category is selected.
- Panels and screens are left aligned. Only the pass, reveal, discuss and result "stage" moments are centred.

## Components to reuse

Use these before creating anything new: `.panel`, `.panel-head` with `.mini` text buttons, `.btn` / `.btn.primary` / `.btn.ghost` / `.btn.big`, `.chip` / `.chip.on` / `.chip-sub`, `.own-chip` + `.chip-edit` (custom categories), `.row` + `.toggle` switch, `.stepper`, `.name-row`, `.field`, `.quick-add`, `.word-row` + `.word-edit`, `.word-card` (edit one word), `.field-label` / `.field-help`, `.saved-status`, `.export-box` + `.export-checks` + `.export-text` (export for contributing), `.text-link` (inline link), `.link` / `.link.danger`, `.back`, `.banner` / `.banner.reveal` / `.reveal.imposter`, `.translit`, `.hint` / `.hint-word`, `.actions`, `.stage`, `.progress`.

### Editing one item in a list

When a list item has optional details, such as a custom word's Thanglish and hint:

- The closed row shows what's filled in on short separate lines ("Thanglish: …", "Hint: …"), or a muted "No Thanglish or hint yet".
- On the right is a pill `.word-edit` button labelled "Edit" or "Add details", then the remove ×. Tapping the row text opens it too.
- Only one item is open at a time. It becomes a `.word-card`: paper background, 2px ink border, 18px radius, `4px 4px 0 var(--ink)` shadow, headed "Editing <item>". The rest of the list dims to 45% opacity.
- Every field has a visible `.field-label`, and a `.field-help` line where it helps. Enter moves to the next field and closes the card on the last one.
- Changes save as you type, and a green "Saved" `.saved-status` (aria-live) confirms it. A compact primary "Done" closes the card and returns focus to that item's Edit button.
- A freshly added item gets a gentle prompt ("Add Thanglish or a hint?") instead of opening automatically, so quick entry stays fast.

### Export for contributing

The custom category editor has an "Export for contributing" `.link`. It opens a `.panel.export-box` with:
- Plain-sentence checks (`.export-checks`). Only "Add at least 2 words to export." blocks the export.
- A read-only `.export-text` textarea in the body font, small. It may scroll sideways inside itself, but the page never does.
- A Copy (primary, compact) button and a Download file (ghost) button, with a "Copied" status.
- A `.text-link` to the README's contributing section.

The snippet must match the `words.js` shape exactly, with JSON-escaped strings. `tools/check-words.js` validates `words.js` for contributors.

## Motion

- The only entrance animation is the reveal banner's `unfold` pop. Don't add fade-ins to every screen or section.
- Motion that answers a tap (button press, switch slide) is fine and short (≤150ms).
- `prefers-reduced-motion` turns all animation off. Keep that rule last in its section.

## Copy

- Use plain, active, sentence-case English. Buttons say exactly what happens: "Start game", "Show my word", "Hide and pass on", "Go to vote", "Play again".
- An action keeps the same name throughout the flow.
- Errors and empty states tell the player what to do, for example "Pick at least one category to start." or "Add 2+ words".
- No arrows appended to buttons, no "A · B · C" meta strings, no "Word — fragment" labels.

## Accessibility and code rules

- Keep focus visible (`:focus-visible` 3px ink outline) and use `aria-pressed` on toggle chips and `aria-disabled` or `disabled` on locked buttons.
- Build anything that shows user-typed text with `textContent`, never `innerHTML`.
- Wrap every `localStorage` read and write in try/catch. Settings use `imposter-settings` and custom lists use `imposter-custom-v1`.
- No frameworks, bundlers or new dependencies without asking the user first.

## Before you commit a visual change

1. Check it at 320px, 375px and 390px: no sideways scroll, nothing overlapping, the main action visible.
2. Play one full round (setup, pass, reveal for both a player and the imposter, discuss, vote, result).
3. Check that no Tamil word wraps on the reveal or result card.
4. Update this file if you added a token, component or rule.
