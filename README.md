# Tamil Imposter

A pass-the-phone imposter party game with Tamil words. Everyone in the group gets the same secret Tamil word except the imposter, who only gets a hint. You take turns giving clues, then vote on who the imposter is. The interface is in English, and every Tamil word and hint has its Thanglish written right below it, so anyone can read it.

**Play:** https://monishdhayalan.github.io/ImposterGame/ (live once GitHub Pages is turned on for this repo)

## How to play

1. Add the players' names and pick the categories you want.
2. Pass the phone around. Each player taps to see their word in private, then hides it.
3. Everyone gets the same word, except the imposter, who sees a hint instead.
4. Take turns giving one clue about the word without saying it, then discuss.
5. Vote for who you think the imposter is. Catch them and everyone else wins. If they escape, the imposter wins.

## Run it locally

There's no build step and nothing to install.

```bash
git clone https://github.com/monishdhayalan/ImposterGame.git
```

Then open `index.html` in a browser. To test on your phone over Wi-Fi, serve the folder (for example `python -m http.server`) and open your computer's address from the phone.

## Contributing words

The easiest way to add words is from inside the game. You don't need to write any code.

### 1. Make your category in the game

1. On the setup screen, under **Categories**, tap **+ New category**.
2. Give it a name and a **Name in Thanglish**.
3. Add your words. Tap **Add details** on each word to fill in its Thanglish, a hint for the imposter and the hint's Thanglish.
4. Tap **Export for contributing**. Fix anything the checks point out, then tap **Copy** (or **Download file**).

The export looks like this, in the same format as `words.js`:

```js
  {
    name: "பழங்கள்", nameEn: "Pazhangal",
    words: [
      { word: "மாம்பழம்", wordEn: "Maambazham", hint: "கோடை", hintEn: "Kodai" },
      { word: "பலாப்பழம்", wordEn: "Palaappazham", hint: "முள்", hintEn: "Mul" }
    ]
  },
```

### 2. Add it to the project

1. **Fork** this repository on GitHub (the Fork button at the top right).
2. In your fork, open `words.js` and click the pencil icon to edit it in the browser. You can also edit it locally.
3. To add a **new category**, paste the snippet as a new item inside the `CATEGORIES` array, just before the final `];`. Make sure the category before yours ends with `},` (with a comma).
4. To add words to an **existing category**, paste only the word lines (`{ word: ... }`) into that category's `words: [ ... ]` list. Put a comma between items.
5. Commit to a new branch, for example `add-pazhangal`, and open a **pull request**. Say what the category is and how many words it has.

Before you open the pull request, open `index.html` in a browser (see "Run it locally") and check that the game still loads and your category shows up. If you have Node.js, `node tools/check-words.js` checks the whole list for missing fields and duplicates.

### Word guidelines

- Write each word in **Tamil script**, plus its **Thanglish the way people actually type it** ("Yaanai", not a formal transliteration).
- A **hint** is one or two Tamil words, plus their Thanglish, that point in the right direction without giving the word away. Don't just repeat the category name.
- Choose **well-known words** that most Tamil people recognise instantly.
- **No duplicates** of words already in the game. The export lists any it finds.
- Keep it family-friendly: **no slurs, hateful or explicit content**.
- **20 or more words** is ideal for a new category.

## Contributing code

- For bigger changes, **open an issue first** so we can agree on the idea.
- Read [DESIGN.md](DESIGN.md) before changing anything players see, and update it in the same pull request if you add a colour, component or rule.
- Test at **320px and 375px** wide, and play one full round (setup, pass, reveal, discuss, vote, result).
- Keep it **dependency-free**: plain HTML, CSS and JavaScript, no frameworks or build tools.

## Project structure

- `index.html`: all the screens
- `style.css`: the design (tokens at the top)
- `app.js`: game logic, custom categories and export
- `words.js`: the built-in word list (`CATEGORIES`)
- `tools/check-words.js`: checks `words.js` for missing fields and duplicates
- `DESIGN.md`: the design guide, which every change follows
- `CLAUDE.md`: notes for AI coding assistants working on the project
- `LICENSE`: the MIT license

## License

MIT. See [LICENSE](LICENSE). By opening a pull request you agree your contribution is shared under the same license.
