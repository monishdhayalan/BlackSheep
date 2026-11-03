(function () {
  "use strict";

  const MIN_PLAYERS = 3;
  const STORAGE_KEY = "imposter-settings";
  const CUSTOM_KEY = "imposter-custom-v1";
  const MIN_CUSTOM_WORDS = 2;
  const DEFAULT_CUSTOM_NAME = "My words";
  const DISCUSS_SECONDS = 180;

  const $ = (id) => document.getElementById(id);

  let custom = loadCustom(); // players' own categories: [{ id, name, words: [{ word, wordEn, hint, hintEn }] }]
  const settings = loadSettings();
  let editing = null; // the custom category open in the editor
  let lastCount = 0; // its word count before the latest change
  let round = null;
  let timerId = null;
  const usedWords = new Set(); // "categoryKey:wordIndex" drawn this session

  // ---------- storage ----------
  function loadSettings() {
    const fallback = { players: 4, imposters: 1, hint: true, names: [], categories: null };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return normalize(saved ? Object.assign(fallback, saved) : fallback);
    } catch (e) {
      return normalize(fallback);
    }
  }
  // The names list is the player list: one entry (possibly blank) per player.
  function normalize(s) {
    if (!Array.isArray(s.names)) s.names = [];
    while (s.names.length < Math.max(MIN_PLAYERS, s.players || 0)) s.names.push("");
    s.players = s.names.length;
    // Selected categories are stored by key (nameEn, or "custom:<id>"); drop unknown ones.
    // Only a brand-new visitor (nothing saved) starts with everything selected; an empty selection is kept.
    const known = selectableKeys();
    s.categories = Array.isArray(s.categories) ? s.categories.filter((n) => known.includes(n)) : known.slice();
    return s;
  }
  function loadCustom() {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY));
      if (!Array.isArray(saved)) return [];
      return saved.filter((c) => c && typeof c.id === "string" && Array.isArray(c.words)).map((c) => ({
        id: c.id,
        name: String(c.name || ""),
        words: c.words.filter((w) => w && String(w.word || "").trim()).map((w) => ({
          word: String(w.word).trim(),
          wordEn: String(w.wordEn || ""),
          hint: String(w.hint || ""),
          hintEn: String(w.hintEn || "")
        }))
      }));
    } catch (e) {
      return [];
    }
  }
  function saveCustom() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); } catch (e) { /* ignore */ }
  }
  function customName(c) { return c.name.trim() || DEFAULT_CUSTOM_NAME; }
  function isPlayable(c) { return c.words.length >= MIN_CUSTOM_WORDS; }
  // Built-in categories plus playable custom ones, in one shape.
  function allCategories() {
    const own = custom.filter(isPlayable).map((c) => ({
      key: "custom:" + c.id,
      name: customName(c),
      nameEn: "",
      words: c.words
    }));
    return CATEGORIES.map((c) => Object.assign({ key: c.nameEn }, c)).concat(own);
  }
  function selectableKeys() { return allCategories().map((c) => c.key); }
  // Keep the selection valid after custom categories change.
  function cleanSelection() {
    const known = selectableKeys();
    settings.categories = settings.categories.filter((k) => known.includes(k));
    saveSettings();
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  // ---------- helpers ----------
  function show(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    window.scrollTo(0, 0);
  }
  // Keep a word on one line: shrink its font until it fits the card's width.
  function fitText(el) {
    if (!el) return;
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth && size > 16) {
      size = Math.max(16, size * 0.94);
      el.style.fontSize = size + "px";
    }
  }
  function fitAll() {
    document.querySelectorAll(".screen.active .secret, .screen.active .hint-word").forEach(fitText);
  }
  window.addEventListener("resize", fitAll);

  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function addLine(parent, cls, text) {
    const p = document.createElement("p");
    if (cls) p.className = cls;
    p.textContent = text;
    parent.appendChild(p);
  }
  function categoryLabel(cat) { return "Category: " + cat.name + (cat.nameEn ? " (" + cat.nameEn + ")" : ""); }
  function maxImposters(players) { return Math.max(1, Math.floor((players - 1) / 2)); }
  function playerName(i) { return (settings.names[i] || "").trim() || "Player " + (i + 1); }

  // ---------- setup screen ----------
  function renderSetup(focusIndex) {
    settings.players = settings.names.length;
    settings.imposters = Math.min(settings.imposters, maxImposters(settings.players));
    $("players-count").textContent = settings.players;
    $("imposters-count").textContent = settings.imposters;
    $("opt-hint").checked = settings.hint;

    const box = $("names");
    box.innerHTML = "";
    settings.names.forEach((name, i) => {
      const row = document.createElement("div");
      row.className = "name-row";

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 20;
      input.placeholder = "Player " + (i + 1);
      input.value = name || "";
      input.addEventListener("input", () => { settings.names[i] = input.value; saveSettings(); });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && i === settings.names.length - 1) addPlayer();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + playerName(i));
      remove.disabled = settings.names.length <= MIN_PLAYERS;
      remove.addEventListener("click", () => {
        settings.names.splice(i, 1);
        saveSettings();
        renderSetup();
      });

      row.appendChild(input);
      row.appendChild(remove);
      box.appendChild(row);
      if (i === focusIndex) input.focus();
    });
  }

  function addPlayer() {
    settings.names.push("");
    saveSettings();
    renderSetup(settings.names.length - 1);
  }
  $("btn-add-player").addEventListener("click", addPlayer);

  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir);
      settings.imposters = Math.min(maxImposters(settings.players), Math.max(1, settings.imposters + dir));
      saveSettings();
      renderSetup();
    });
  });
  $("opt-hint").addEventListener("change", (e) => { settings.hint = e.target.checked; saveSettings(); });

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => { stopTimer(); renderSetup(); show(btn.dataset.go); });
  });
  $("btn-howto").addEventListener("click", () => show("howto"));

  // ---------- categories ----------
  function renderCategories() {
    const box = $("categories");
    box.innerHTML = "";
    const keys = selectableKeys();
    const picked = settings.categories.length;
    $("btn-cat-all").disabled = picked === keys.length;
    $("btn-cat-none").disabled = picked === 0;
    $("btn-start").disabled = picked === 0;
    $("btn-start").setAttribute("aria-disabled", picked === 0 ? "true" : "false");
    $("start-note").hidden = picked > 0;
    CATEGORIES.forEach((cat) => box.appendChild(toggleChip(cat.name, cat.nameEn, cat.nameEn)));

    custom.forEach((c) => {
      const key = "custom:" + c.id;
      const group = document.createElement("span");
      group.className = "own-chip";
      const playable = isPlayable(c);
      const chip = playable
        ? toggleChip(customName(c), c.words.length + " words", key)
        : makeChip(customName(c), "Add " + MIN_CUSTOM_WORDS + "+ words", false, () => openEditor(c.id));
      if (!playable) chip.classList.add("unready");
      chip.classList.add("own");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "chip-edit";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", "Edit " + customName(c));
      edit.addEventListener("click", () => openEditor(c.id));
      group.appendChild(chip);
      group.appendChild(edit);
      box.appendChild(group);
    });

    const add = makeChip("+ New category", "", false, () => openEditor(null));
    add.classList.add("new");
    box.appendChild(add);
  }
  function toggleChip(label, sub, key) {
    const on = settings.categories.includes(key);
    return makeChip(label, sub, on, () => {
      settings.categories = on
        ? settings.categories.filter((n) => n !== key)
        : settings.categories.concat(key);
      saveSettings();
      renderCategories();
    });
  }
  function makeChip(label, sub, on, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    const main = document.createElement("span");
    main.textContent = label;
    b.appendChild(main);
    if (sub) {
      const small = document.createElement("span");
      small.className = "chip-sub";
      small.textContent = sub;
      b.appendChild(small);
    }
    b.addEventListener("click", onClick);
    return b;
  }

  // Random category from the selected ones, then a random word from it,
  // without repeats until every word in the selected categories has been used.
  function pickWord() {
    const pool = allCategories().filter((c) => settings.categories.includes(c.key));
    const unused = (cat) => cat.words.map((w, wi) => wi).filter((wi) => !usedWords.has(cat.key + ":" + wi));
    let open = pool.filter((cat) => unused(cat).length);
    if (!open.length) {
      pool.forEach((cat) => cat.words.forEach((w, wi) => usedWords.delete(cat.key + ":" + wi)));
      open = pool;
    }
    const cat = open[randInt(open.length)];
    const choices = unused(cat);
    const wi = choices[randInt(choices.length)];
    usedWords.add(cat.key + ":" + wi);
    return { category: cat, word: cat.words[wi] };
  }

  // ---------- custom category editor ----------
  // Every change is saved straight away; "Save" just returns to setup.
  function openEditor(id) {
    editing = custom.find((c) => c.id === id) || null;
    if (!editing) {
      editing = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: DEFAULT_CUSTOM_NAME, words: [] };
      custom.push(editing);
      saveCustom();
    }
    lastCount = editing.words.length;
    $("custom-name").value = editing.name;
    $("custom-add").value = "";
    $("custom-paste").value = "";
    $("paste-box").hidden = true;
    $("btn-paste-toggle").setAttribute("aria-expanded", "false");
    setEditorNote("");
    renderWords();
    show("custom");
  }
  function closeEditor() {
    if (editing && !editing.words.length) {
      custom = custom.filter((c) => c !== editing); // nothing was added: drop the empty category
    } else if (editing && !editing.name.trim()) {
      editing.name = DEFAULT_CUSTOM_NAME;
    }
    saveCustom();
    editing = null;
    cleanSelection();
    renderCategories();
    show("setup");
  }
  function changed() {
    saveCustom();
    // A category that just reached the minimum becomes selected.
    const key = "custom:" + editing.id;
    if (lastCount < MIN_CUSTOM_WORDS && isPlayable(editing) && !settings.categories.includes(key)) {
      settings.categories.push(key);
      saveSettings();
    }
    lastCount = editing.words.length;
    renderWords();
  }
  function setEditorNote(text) { $("custom-note").textContent = text; }

  function normWord(t) { return t.trim().toLowerCase(); }
  // Add one word; returns false when it is blank or already in the list.
  function addWord(word, wordEn, hint, hintEn) {
    word = (word || "").trim();
    if (!word) return false;
    if (editing.words.some((w) => normWord(w.word) === normWord(word))) return false;
    editing.words.push({ word: word, wordEn: (wordEn || "").trim(), hint: (hint || "").trim(), hintEn: (hintEn || "").trim() });
    return true;
  }
  function quickAdd() {
    const input = $("custom-add");
    const text = input.value.trim();
    if (!text) return;
    if (addWord(text)) {
      setEditorNote("");
      input.value = "";
      changed();
    } else {
      setEditorNote("\u201c" + text + "\u201d is already in this list.");
    }
    input.focus();
  }
  function pasteAdd() {
    const lines = $("custom-paste").value.split(/\r?\n/);
    let added = 0, skipped = 0;
    lines.forEach((line) => {
      if (!line.trim()) return;
      const parts = line.split(",");
      if (addWord(parts[0], parts[1], parts[2], parts[3])) added++;
      else skipped++;
    });
    $("custom-paste").value = "";
    setEditorNote(added + (added === 1 ? " word" : " words") + " added" + (skipped ? ", " + skipped + " skipped as duplicates" : "") + ".");
    changed();
  }

  function renderWords() {
    const n = editing.words.length;
    $("custom-count").textContent = n;
    $("custom-min").textContent = n < MIN_CUSTOM_WORDS ? "Add at least " + MIN_CUSTOM_WORDS + " words to play this category." : "";
    const box = $("custom-words");
    box.innerHTML = "";
    editing.words.forEach((w, i) => {
      const row = document.createElement("div");
      row.className = "word-row";

      const head = document.createElement("div");
      head.className = "word-head";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "word-toggle";
      toggle.setAttribute("aria-expanded", "false");
      const label = document.createElement("span");
      label.className = "word-label";
      label.textContent = w.word;
      const extra = document.createElement("span");
      extra.className = "word-extra";
      extra.textContent = [w.wordEn, w.hint ? "Hint: " + w.hint : ""].filter(Boolean).join(", ") || "Add Thanglish or a hint";
      toggle.appendChild(label);
      toggle.appendChild(extra);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + w.word);
      remove.addEventListener("click", () => {
        editing.words.splice(i, 1);
        changed();
      });
      head.appendChild(toggle);
      head.appendChild(remove);

      const details = document.createElement("div");
      details.className = "word-details";
      details.hidden = true;
      [["wordEn", "Thanglish"], ["hint", "Hint for the imposter"], ["hintEn", "Hint in Thanglish"]].forEach(([field, text]) => {
        const lab = document.createElement("label");
        lab.className = "field small-field";
        const span = document.createElement("span");
        span.textContent = text;
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 40;
        input.value = w[field];
        input.addEventListener("input", () => {
          w[field] = input.value.trim();
          extra.textContent = [w.wordEn, w.hint ? "Hint: " + w.hint : ""].filter(Boolean).join(", ") || "Add Thanglish or a hint";
          saveCustom();
        });
        lab.appendChild(span);
        lab.appendChild(input);
        details.appendChild(lab);
      });
      toggle.addEventListener("click", () => {
        details.hidden = !details.hidden;
        toggle.setAttribute("aria-expanded", details.hidden ? "false" : "true");
        row.classList.toggle("open", !details.hidden);
      });

      row.appendChild(head);
      row.appendChild(details);
      box.appendChild(row);
    });
  }

  $("custom-name").addEventListener("input", (e) => { editing.name = e.target.value; saveCustom(); });
  $("btn-custom-add").addEventListener("click", quickAdd);
  $("custom-add").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); quickAdd(); } });
  $("btn-paste-toggle").addEventListener("click", () => {
    const box = $("paste-box");
    box.hidden = !box.hidden;
    $("btn-paste-toggle").setAttribute("aria-expanded", box.hidden ? "false" : "true");
    if (!box.hidden) $("custom-paste").focus();
  });
  $("btn-paste-add").addEventListener("click", pasteAdd);
  $("btn-delete-category").addEventListener("click", () => {
    if (!window.confirm("Delete \u201c" + customName(editing) + "\u201d and all its words?")) return;
    custom = custom.filter((c) => c !== editing);
    editing = null;
    saveCustom();
    cleanSelection();
    renderCategories();
    show("setup");
  });
  $("btn-custom-back").addEventListener("click", closeEditor);
  $("btn-custom-save").addEventListener("click", closeEditor);

  // ---------- round ----------
  $("btn-cat-all").addEventListener("click", () => {
    settings.categories = selectableKeys();
    saveSettings();
    renderCategories();
  });
  $("btn-cat-none").addEventListener("click", () => {
    settings.categories = [];
    saveSettings();
    renderCategories();
  });

  function startRound() {
    if (!allCategories().some((c) => settings.categories.includes(c.key))) {
      stopTimer(); // nothing to draw from: back to setup to pick a category
      renderSetup();
      renderCategories();
      show("setup");
      return;
    }
    const pick = pickWord();
    const entry = pick.word;
    const order = shuffle([...Array(settings.players).keys()]);
    const imposters = new Set(order.slice(0, settings.imposters));
    round = {
      entry: entry,
      category: pick.category,
      imposters: imposters,
      current: 0,
      firstSpeaker: randInt(settings.players)
    };
    showPass();
  }

  function showPass() {
    $("pass-name").textContent = playerName(round.current);
    const prog = $("pass-progress");
    prog.innerHTML = "";
    for (let i = 0; i < settings.players; i++) {
      const dot = document.createElement("span");
      if (i < round.current) dot.className = "done";
      prog.appendChild(dot);
    }
    show("pass");
  }

  function showReveal() {
    const isImposter = round.imposters.has(round.current);
    const card = $("reveal-card");
    card.classList.toggle("imposter", isImposter);
    const hintBox = $("reveal-hint");
    hintBox.innerHTML = "";
    if (isImposter) {
      $("reveal-label").textContent = playerName(round.current) + ", you are the…";
      $("reveal-word").textContent = "Imposter! 🤫";
      $("reveal-translit").textContent = "";
      if (settings.hint && round.entry.hint) {
        addLine(hintBox, "muted", "Your hint");
        addLine(hintBox, "muted small", categoryLabel(round.category));
        addLine(hintBox, "hint-word", round.entry.hint);
        addLine(hintBox, "translit", round.entry.hintEn);
      } else {
        addLine(hintBox, "muted small", categoryLabel(round.category));
        addLine(hintBox, "", "Blend in without getting caught!");
      }
    } else {
      $("reveal-label").textContent = playerName(round.current) + ", your word is";
      $("reveal-word").textContent = round.entry.word;
      $("reveal-translit").textContent = round.entry.wordEn;
      addLine(hintBox, "", "Don't tell anyone!");
    }
    const last = round.current === settings.players - 1;
    $("btn-hide").textContent = last ? "Hide and start discussing" : "Hide and pass on";
    show("reveal");
    fitAll();
  }

  function nextPlayer() {
    round.current++;
    if (round.current >= settings.players) showDiscuss();
    else showPass();
  }

  // ---------- discussion ----------
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
  function showDiscuss() {
    stopTimer();
    $("first-speaker").textContent = playerName(round.firstSpeaker);
    $("timer").textContent = formatTime(DISCUSS_SECONDS);
    $("timer").classList.remove("done");
    $("btn-timer").textContent = "Start timer";
    $("btn-timer").disabled = false;
    show("discuss");
  }
  $("btn-timer").addEventListener("click", () => {
    if (timerId) return;
    let left = DISCUSS_SECONDS;
    $("btn-timer").textContent = "Running…";
    $("btn-timer").disabled = true;
    timerId = setInterval(() => {
      left--;
      $("timer").textContent = formatTime(Math.max(0, left));
      if (left <= 0) {
        stopTimer();
        $("timer").classList.add("done");
        $("btn-timer").textContent = "Time is up!";
        if (navigator.vibrate) navigator.vibrate(400);
      }
    }, 1000);
  });

  // ---------- vote & result ----------
  function showVote() {
    stopTimer();
    const list = $("vote-list");
    list.innerHTML = "";
    for (let i = 0; i < settings.players; i++) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = playerName(i);
      b.addEventListener("click", () => showResult(i));
      list.appendChild(b);
    }
    show("vote");
  }

  function showResult(votedOut) {
    const caught = round.imposters.has(votedOut);
    $("screen-result").classList.toggle("caught", caught);
    $("result-emoji").textContent = caught ? "🎉" : "😈";
    $("result-title").textContent = caught ? "Imposter caught!" : "The imposter escaped!";
    $("result-detail").textContent = caught
      ? playerName(votedOut) + " was the imposter. Everyone else wins!"
      : playerName(votedOut) + " was not the imposter. The imposter wins!";
    $("result-word").textContent = round.entry.word;
    $("result-translit").textContent = round.entry.wordEn;
    $("result-category").textContent = categoryLabel(round.category);
    const names = [...round.imposters].sort((a, b) => a - b).map(playerName).join(", ");
    $("result-imposters").textContent = (round.imposters.size > 1 ? "Imposters: " : "Imposter: ") + names;
    show("result");
    fitAll();
  }

  // ---------- wiring ----------
  $("btn-start").addEventListener("click", startRound);
  $("btn-reveal").addEventListener("click", showReveal);
  $("btn-hide").addEventListener("click", nextPlayer);
  $("btn-to-vote").addEventListener("click", showVote);
  $("btn-again").addEventListener("click", startRound);

  renderSetup();
  renderCategories();
})();
