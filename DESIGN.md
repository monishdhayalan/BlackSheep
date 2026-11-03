# Tamil Imposter: design guide

Read this file before changing anything players see, and update it in the same commit when a design decision changes. If the code and this file disagree, ask which one is right; don't silently pick one.

## What the game is

A pass-the-phone party game. One phone goes around a room, usually in the evening, often with family. Everyone sees the same secret Tamil word except the imposter. Phones are the main platform. Desktop just shows the same single column, centred.

The look borrows from Tamil street visuals: hand-painted cinema banners, kolam dot grids, turmeric and kumkum colours, banana leaf. It should never look like a generic dark "game app" or a SaaS card kit.

## Language rules

- The interface is in **English only**: buttons, titles, instructions and messages.
- Only the **secret words, hints and category names** are in Tamil.
- Every Tamil word, hint and category name has a **Thanglish line right below it** (Tamil written in English letters), styled with `.translit`. A missing Thanglish line hides itself (`.translit:empty`).
- Custom (player-made) words can be in any language. Their Thanglish and hint are optional.
- The secret word, the hint word and the result word always stay on **one line**. `fitText()` in `app.js` shrinks them to fit (minimum 16px). Never let them wrap.

## Colour tokens (`style.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--turmeric` | `#F2B23A` | Page background, text on maroon buttons and chips |
| `--turmeric-deep` | `#E09A1F` | Reserved, deeper turmeric |
| `--ink` | `#3A0B14` | Main text, borders, primary buttons, selected chips, hard shadows |
| `--ink-soft` | `#6E3A2C` | Secondary text, placeholders, dashed outlines |
| `--kumkum` | `#C8102E` | Imposter banner, title and button offset shadows, errors, "imposter escaped" |
| `--leaf` | `#1E6B3A` | "Imposter caught" only |
| `--paper` | `#FFF9EE` | Panels and banners |
| `--line` | `rgba(58,11,20,.14)` | Hairlines, input borders, progress track |

- The body has a faint **kolam dot grid**: an ink radial-gradient on a 22px grid.
- Don't add new colours. If one is really needed, add it as a token here first.
- Never use pure black or grey: ink is maroon.

## Type

- **Baloo Thambi 2** (500/700/800), `--display`: headings, secret words, player names, timer, buttons, chips.
- **Hind Madurai** (400/600), `--body`: everything else.
- Both are loaded from Google Fonts in `index.html` and both cover Tamil.
- Use the scale tokens, not raw sizes: `--t-sm .875`, `--t-md 1`, `--t-lg 1.25`, `--t-xl 1.563`, `--t-2xl 2.441`, `--t-3xl 3.815` rem (ratio 1.25).
  - The exceptions are the secret word, `clamp(2.6rem, 14vw, 4.2rem)`, and the timer, `5rem`.
- Use sentence case everywhere. No ALL-CAPS labels, no eyebrow labels above headings, and no accenting one word of a headline in a different colour or style.

## Shape, depth and motion

- **Borders:** 2px solid `--ink` on panels, buttons and chips. The banner uses 3px. Dashed outlines mean "add something" or "not ready yet": "+ Add player", "+ New category", a category with fewer than 2 words, and the hint input.
- **Radii follow hierarchy:** banner 28px, panel 22px, button 18px, input 14px, chips and pills 999px, round icon buttons 50%.
- **Hard offset shadows are the signature. Use them sparingly:**
  - Banner (the word reveal): `6px 6px 0 var(--ink)`
  - Result answer banner: `4px 4px 0 var(--ink)`
  - Primary button: `4px 4px 0 var(--kumkum)`, pressing it moves the button into its shadow.
  - Title and player name: `text-shadow: 3px 3px 0 var(--kumkum)`
  - Setup panels get **no** shadow. Don't add soft or blurred shadows anywhere.
- **Motion:** one orchestrated moment, the banner "unfold" when a word is revealed. Other motion only responds to a tap: button press, toggle switch. No entrance animations on screens or sections. `prefers-reduced-motion` turns all motion off.

## Layout

- One column, `max-width: 460px`, with a 16px side gutter and safe-area padding for the notch and home bar.
- Every screen is a `.screen` section, and only `.screen.active` shows. `show(name)` in `app.js` switches screens.
- **The main action sits at the bottom of the screen in `.actions`** (sticky, within thumb reach), with an opaque turmeric fade behind it. Each screen has one primary button there; a secondary ghost button can sit under it.
- Game screens (pass, reveal, discuss, result) centre their content in `.stage`. Setup and editor screens stack `.panel`s.
- Nothing may scroll sideways. Test at **320px and 375px**.

## Components (reuse these, don't invent new ones)

- `.panel`: paper box with a 2px ink border, 22px radius, no shadow.
- `.panel-head`: an h2 with small actions on the right. They must stay on one row at 320px.
- `.banner`: the loud element. Use it only for the secret word, and for the answer on the result screen.
- `.reveal.imposter`: the banner in full kumkum with paper text.
- Buttons:
  - `.btn.primary` (maroon, turmeric text, kumkum offset shadow). Add `.big` for the bottom action.
  - `.btn.ghost` (outline only).
  - `.link` (underlined text button).
  - `.mini` (small underlined header actions).
  - `.back` ("‹ Back").
  - A disabled primary button is greyed out with no shadow.
- `.chip`: a pill with the Tamil name, and the Thanglish below it in `.chip-sub`. `.on` means selected (maroon fill). `.own` marks a player's category, with an attached `.chip-edit`.
- `.count`: a maroon pill showing a number next to a heading.
- `.stepper`: 44px round − and + buttons around a display-font number.
- `.toggle`: a switch built from a checkbox.
- Inputs: 48px tall, 14px radius, `--line` border that turns ink on focus. `.field` wraps a label and an input.
- Messages:
  - `.form-note` (muted status)
  - `.form-error` (kumkum)
  - `.start-note` (kumkum, centred above the start button)
  - Each one hides itself when empty.
- `[hidden]` always wins (`display: none !important`), so you can toggle elements with the `hidden` attribute.

## Touch and accessibility

- Every tap target is at least 44px, and most are 48–60px.
- Keep a visible focus outline: `:focus-visible` uses 3px ink.
- Contrast: ink on turmeric or paper, turmeric on ink, paper on kumkum. Don't put `--ink-soft` text on kumkum.
- Build the DOM with `textContent`, never `innerHTML` with player-typed text.

## Copy

- Plain verbs, sentence case, written from the player's side: "Start game", "Show my word", "Hide and pass on", "Go to vote", "Play again", "Save".
- An action keeps the same name throughout the flow.
- Errors say what to do: "Pick at least one category to start." "Add at least 2 words to play this category."
- No filler or marketing tone. Exclamation marks are fine in game moments ("Imposter caught!") but not in instructions.

## Checklist before committing a visible change

1. Uses only the tokens and components above, or this file is updated in the same commit.
2. English UI, Tamil plus Thanglish for words and hints, secret words on one line.
3. Main action is still at the bottom, and tap targets are 44px or more.
4. Checked in the browser at 320px and 375px: no sideways scroll, no overlap, no console errors.
5. Played one full round: setup, pass, reveal (normal player and imposter), discuss, vote, result.
