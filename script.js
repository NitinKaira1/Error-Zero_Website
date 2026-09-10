const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light" || savedTheme === "dark") {
  root.dataset.theme = savedTheme;
}

function updateToggle() {
  const isLight = root.dataset.theme === "light";

  toggle.setAttribute(
    "aria-pressed",
    String(isLight)
  );

  toggle.setAttribute(
    "aria-label",
    isLight
      ? "Switch to dark theme"
      : "Switch to light theme"
  );
}

toggle.addEventListener("click", () => {
  root.dataset.theme =
    root.dataset.theme === "dark"
      ? "light"
      : "dark";

  localStorage.setItem(
    "theme",
    root.dataset.theme
  );

  updateToggle();
});


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

updateToggle();