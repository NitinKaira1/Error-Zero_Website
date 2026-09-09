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

updateToggle();