/* ------------------------------------------------------------------ */
/* THEME — synced with the portfolio's saved preference                */
/* ------------------------------------------------------------------ */

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light" || savedTheme === "dark") {
  root.dataset.theme = savedTheme;
}

function updateThemeToggle() {
  const isLight = root.dataset.theme === "light";
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme"
  );
}

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  updateThemeToggle();
});

updateThemeToggle();


/* ------------------------------------------------------------------ */
/* CLICK FX — gem-shaped burst on click                                */
/* ------------------------------------------------------------------ */

(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;

  document.addEventListener("click", (e) => {
    const fx = document.createElement("span");
    fx.className = "click-fx";
    fx.style.left = e.clientX + "px";
    fx.style.top = e.clientY + "px";

    document.body.appendChild(fx);
    fx.addEventListener("animationend", () => fx.remove());
  });
})();


/* ------------------------------------------------------------------ */
/* RAVEN WATCH — whack-a-raven                                         */
/* ------------------------------------------------------------------ */

const LANTERN_SVG = `
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="2" x2="20" y2="8" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 8 H28 L25 15 H15 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="13" y="15" width="14" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <line x1="13" y1="20" x2="27" y2="20" stroke="currentColor" stroke-width="1"/>
    <line x1="13" y1="26" x2="27" y2="26" stroke="currentColor" stroke-width="1"/>
    <path d="M17 23 q3 -6 3 -9 q3 3 3 9 a3 3 0 1 1 -6 0 Z" fill="currentColor"/>
    <path d="M15 31 H25 L23 36 H17 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>
`;

const RAVEN_SVG = `
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 24 C 10 14, 17 9, 22 10 C 21 7, 24 5, 27 6 C 25 8, 25 10, 27 11 C 33 12, 36 18, 34 23 C 31 20, 27 19, 24 20 C 27 23, 28 27, 26 31 C 24 27, 21 24, 18 23 C 19 27, 18 30, 15 32 C 15 28, 14 25, 12 23 C 9 25, 7 25, 6 24 Z" fill="currentColor"/>
    <circle cx="24" cy="13.5" r="1" fill="var(--surface)"/>
  </svg>
`;

const POST_COUNT = 9;
const GAME_SECONDS = 45;
const START_LIVES = 3;
const RELIGHT_DELAY_MS = 1600;

const board = document.getElementById("board");
const scoreValue = document.getElementById("scoreValue");
const livesValue = document.getElementById("livesValue");
const timeValue = document.getElementById("timeValue");

const startOverlay = document.getElementById("startOverlay");
const endOverlay = document.getElementById("endOverlay");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const finalScoreEl = document.getElementById("finalScore");
const bestScoreEl = document.getElementById("bestScore");
const endHeading = document.getElementById("endHeading");
const endEyebrow = document.getElementById("endEyebrow");

const HIGH_SCORE_KEY = "ravenWatchHighScore";

let posts = [];
let score = 0;
let lives = START_LIVES;
let secondsLeft = GAME_SECONDS;
let spawnTimeoutId = null;
let tickIntervalId = null;
let running = false;

/* Build the 3x3 board once */
function buildBoard() {
  board.innerHTML = "";
  posts = [];

  for (let i = 0; i < POST_COUNT; i++) {
    const post = document.createElement("button");
    post.type = "button";
    post.className = "post";
    post.setAttribute("aria-label", "Lantern post " + (i + 1));

    post.innerHTML = `
      <span class="post-glow"></span>
      <span class="lantern">${LANTERN_SVG}</span>
      <span class="raven">${RAVEN_SVG}</span>
      <span class="feather"></span>
      <span class="feather"></span>
      <span class="feather"></span>
    `;

    post.addEventListener("click", () => onPostTap(i));
    board.appendChild(post);

    posts.push({
      el: post,
      hasRaven: false,
      snuffed: false,
      snuffTimeoutId: null,
    });
  }
}

function difficultyElapsedFraction() {
  return 1 - secondsLeft / GAME_SECONDS;
}

/* Ravens land faster and linger for less time as the round goes on */
function spawnInterval() {
  const f = difficultyElapsedFraction();
  const base = 950 - f * 500; // 950ms -> 450ms
  const jitter = Math.random() * 300;
  return Math.max(380, base + jitter);
}

function ravenDuration() {
  const f = difficultyElapsedFraction();
  const base = 1350 - f * 650; // 1350ms -> 700ms
  return Math.max(600, base);
}

function randomAvailablePostIndex() {
  const candidates = posts
    .map((p, i) => i)
    .filter((i) => !posts[i].hasRaven && !posts[i].snuffed);

  if (candidates.length === 0) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function scheduleNextSpawn() {
  if (!running) return;
  spawnTimeoutId = setTimeout(() => {
    spawnRaven();
    scheduleNextSpawn();
  }, spawnInterval());
}

function spawnRaven() {
  const idx = randomAvailablePostIndex();
  if (idx === -1) return;

  const post = posts[idx];
  post.hasRaven = true;
  post.el.classList.remove("raven-shooed");
  post.el.classList.add("raven-active");

  const duration = ravenDuration();

  post.missTimeoutId = setTimeout(() => {
    if (!post.hasRaven) return; // already shooed
    missRaven(idx);
  }, duration);
}

function missRaven(idx) {
  const post = posts[idx];
  post.hasRaven = false;
  post.el.classList.remove("raven-active");
  snuffLantern(idx);
  loseLife();
}

function snuffLantern(idx) {
  const post = posts[idx];
  post.snuffed = true;
  post.el.classList.add("snuffed");

  clearTimeout(post.snuffTimeoutId);
  post.snuffTimeoutId = setTimeout(() => {
    post.snuffed = false;
    post.el.classList.remove("snuffed");
  }, RELIGHT_DELAY_MS);
}

function onPostTap(idx) {
  if (!running) return;

  const post = posts[idx];
  if (!post.hasRaven) return;

  clearTimeout(post.missTimeoutId);
  post.hasRaven = false;

  post.el.classList.remove("raven-active");
  post.el.classList.add("raven-shooed");

  setTimeout(() => {
    post.el.classList.remove("raven-shooed");
  }, 340);

  addScore(1);
}

function addScore(n) {
  score += n;
  scoreValue.textContent = String(score);
}

function loseLife() {
  lives = Math.max(0, lives - 1);

  const lifeEls = livesValue.querySelectorAll(".life");
  lifeEls.forEach((el, i) => {
    el.classList.toggle("spent", i >= lives);
  });

  if (lives <= 0) {
    endGame("lanterns");
  }
}

function tick() {
  secondsLeft -= 1;
  timeValue.textContent = String(Math.max(0, secondsLeft));
  timeValue.classList.toggle("time-low", secondsLeft <= 10);

  if (secondsLeft <= 0) {
    endGame("time");
  }
}

function resetBoardState() {
  posts.forEach((post, i) => {
    clearTimeout(post.missTimeoutId);
    clearTimeout(post.snuffTimeoutId);
    post.hasRaven = false;
    post.snuffed = false;
    post.el.classList.remove("raven-active", "raven-shooed", "snuffed");
  });
}

function startGame() {
  resetBoardState();

  score = 0;
  lives = START_LIVES;
  secondsLeft = GAME_SECONDS;
  running = true;

  scoreValue.textContent = "0";
  timeValue.textContent = String(GAME_SECONDS);
  timeValue.classList.remove("time-low");
  livesValue.querySelectorAll(".life").forEach((el) => el.classList.remove("spent"));

  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");

  clearTimeout(spawnTimeoutId);
  clearInterval(tickIntervalId);

  tickIntervalId = setInterval(tick, 1000);
  scheduleNextSpawn();
}

function endGame(reason) {
  if (!running) return;
  running = false;

  clearTimeout(spawnTimeoutId);
  clearInterval(tickIntervalId);
  resetBoardState();

  const best = Math.max(score, Number(localStorage.getItem(HIGH_SCORE_KEY) || 0));
  localStorage.setItem(HIGH_SCORE_KEY, String(best));

  finalScoreEl.textContent = String(score);
  bestScoreEl.textContent = String(best);

  if (reason === "lanterns") {
    endEyebrow.textContent = "The last lantern goes dark";
    endHeading.textContent = "The ravens win this round";
  } else {
    endEyebrow.textContent = "The garden falls quiet";
    endHeading.textContent = "Watch complete";
  }

  endOverlay.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

buildBoard();