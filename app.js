(function () {
  "use strict";

  const MIN_PLAYERS = 3;
  const STORAGE_KEY = "imposter-settings";
  const DISCUSS_SECONDS = 180;

  const $ = (id) => document.getElementById(id);

  const settings = loadSettings();
  let round = null;
  let timerId = null;

  // ---------- storage ----------
  function loadSettings() {
    const fallback = { players: 4, imposters: 1, hint: true, names: [] };
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
    return s;
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

  // ---------- round ----------
  function startRound() {
    const entry = window.WORDS[randInt(window.WORDS.length)];
    const order = shuffle([...Array(settings.players).keys()]);
    const imposters = new Set(order.slice(0, settings.imposters));
    round = {
      entry: entry,
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
      if (settings.hint) {
        addLine(hintBox, "muted", "Your hint");
        addLine(hintBox, "hint-word", round.entry.hint);
        addLine(hintBox, "translit", round.entry.hintEn);
      } else {
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
    $("result-emoji").textContent = caught ? "🎉" : "😈";
    $("result-title").textContent = caught ? "Imposter caught!" : "The imposter escaped!";
    $("result-detail").textContent = caught
      ? playerName(votedOut) + " was the imposter. Everyone else wins!"
      : playerName(votedOut) + " was not the imposter. The imposter wins!";
    $("result-word").textContent = round.entry.word;
    $("result-translit").textContent = round.entry.wordEn;
    const names = [...round.imposters].sort((a, b) => a - b).map(playerName).join(", ");
    $("result-imposters").textContent = (round.imposters.size > 1 ? "Imposters: " : "Imposter: ") + names;
    show("result");
  }

  // ---------- wiring ----------
  $("btn-start").addEventListener("click", startRound);
  $("btn-reveal").addEventListener("click", showReveal);
  $("btn-hide").addEventListener("click", nextPlayer);
  $("btn-to-vote").addEventListener("click", showVote);
  $("btn-again").addEventListener("click", startRound);

  renderSetup();
})();
