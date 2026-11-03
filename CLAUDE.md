# Black Sheep

Black Sheep: a pass-the-phone party game with Tamil words. Always call the game "Black Sheep" and the hidden player "the black sheep", in code, copy and docs alike. Static site (index.html, style.css, app.js, words.js), no build step, hosted on GitHub Pages from `main` (root).

**Always read and follow [DESIGN.md](DESIGN.md) before making any change**, whether to the UI, copy, layout or features. Keep DESIGN.md up to date in the same commit when you add a colour, component, screen or rule.

- Word list: `words.js` defines `const CATEGORIES = [{ name, nameEn, words: [{ word, wordEn, hint, hintEn }] }]`.
- To test, open index.html in a browser at phone width (375px) and play a full round.
