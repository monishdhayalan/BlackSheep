(function () {
  "use strict";

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 12;
  const STORAGE_KEY = "kallan-settings";
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
      return saved ? Object.assign(fallback, saved) : fallback;
    } catch (e) {
      return fallback;
    }
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
  function maxImposters(players) { return Math.max(1, Math.floor((players - 1) / 2)); }
  function playerName(i) { return (settings.names[i] || "").trim() || "வீரர் " + (i + 1); }

  // ---------- setup screen ----------
  function renderSetup() {
    settings.imposters = Math.min(settings.imposters, maxImposters(settings.players));
    $("players-count").textContent = settings.players;
    $("imposters-count").textContent = settings.imposters;
    $("opt-hint").checked = settings.hint;

    const box = $("names");
    box.innerHTML = "";
    for (let i = 0; i < settings.players; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 20;
      input.placeholder = "வீரர் " + (i + 1);
      input.value = settings.names[i] || "";
      input.addEventListener("input", () => { settings.names[i] = input.value; saveSettings(); });
      box.appendChild(input);
    }
  }

  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.step;
      const dir = Number(btn.dataset.dir);
      if (key === "players") {
        settings.players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, settings.players + dir));
      } else {
        settings.imposters = Math.min(maxImposters(settings.players), Math.max(1, settings.imposters + dir));
      }
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
      word: entry.word,
      category: entry.category,
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
    if (isImposter) {
      $("reveal-label").textContent = playerName(round.current) + ", நீங்கள் தான்…";
      $("reveal-word").textContent = "கள்ளன்! 🤫";
      $("reveal-hint").textContent = settings.hint
        ? "குறிப்பு: வகை “" + round.category + "”"
        : "யாருக்கும் தெரியாமல் கலந்துகொள்ளுங்கள்!";
    } else {
      $("reveal-label").textContent = playerName(round.current) + ", உங்கள் வார்த்தை";
      $("reveal-word").textContent = round.word;
      $("reveal-hint").textContent = "இதை யாரிடமும் சொல்லாதீர்கள்!";
    }
    const last = round.current === settings.players - 1;
    $("btn-hide").textContent = last ? "மறைத்து, விவாதத்தைத் தொடங்கு" : "மறைத்து, அடுத்தவருக்குக் கொடு";
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
    $("btn-timer").textContent = "டைமர் தொடங்கு";
    $("btn-timer").disabled = false;
    show("discuss");
  }
  $("btn-timer").addEventListener("click", () => {
    if (timerId) return;
    let left = DISCUSS_SECONDS;
    $("btn-timer").textContent = "ஓடிக்கொண்டிருக்கிறது…";
    $("btn-timer").disabled = true;
    timerId = setInterval(() => {
      left--;
      $("timer").textContent = formatTime(Math.max(0, left));
      if (left <= 0) {
        stopTimer();
        $("timer").classList.add("done");
        $("btn-timer").textContent = "நேரம் முடிந்தது!";
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
    $("result-title").textContent = caught ? "கள்ளன் பிடிபட்டான்!" : "கள்ளன் தப்பிவிட்டான்!";
    $("result-detail").textContent = caught
      ? playerName(votedOut) + " தான் கள்ளன். மற்றவர்கள் வெற்றி!"
      : playerName(votedOut) + " கள்ளன் இல்லை. கள்ளன் வெற்றி!";
    $("result-word").textContent = round.word;
    const names = [...round.imposters].sort((a, b) => a - b).map(playerName).join(", ");
    $("result-imposters").textContent = (round.imposters.size > 1 ? "கள்ளர்கள்: " : "கள்ளன்: ") + names;
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
