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


/* ------------------------------------------------------------------ */
/* BACKGROUND FX — drifting embers + a cursor-carried lantern glow     */
/* ------------------------------------------------------------------ */

(() => {
  const canvas = document.getElementById("bg-fx");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let particles = [];
  let colors = readColors();
  let running = true;
  let rafId = null;

  // Lantern (cursor / touch) state
  const lantern = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    radius: 240,
    active: false,
    fade: 0, // eased 0..1 visibility
  };

  function readColors() {
    const styles = getComputedStyle(document.documentElement);

    return {
      accent: styles.getPropertyValue("--accent").trim() || "#168b78",
      accentSoft: styles.getPropertyValue("--accent-soft").trim() || "#5d9c8e",
      gold: styles.getPropertyValue("--gold").trim() || "#d2ad63",
      bg: styles.getPropertyValue("--bg").trim() || "#06191a",
    };
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");

    const bigint = parseInt(
      clean.length === 3
        ? clean.split("").map((c) => c + c).join("")
        : clean,
      16
    );

    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  function particleCount() {
    const area = width * height;
    const count = Math.round(area / 16000);

    return Math.max(24, Math.min(count, 70));
  }

  function makeParticle() {
    const emberIsGold = Math.random() < 0.35;

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.08 - Math.random() * 0.18,
      radius: 0.8 + Math.random() * 1.8,
      baseAlpha: 0.15 + Math.random() * 0.35,
      swayAmp: 8 + Math.random() * 18,
      swaySpeed: 0.2 + Math.random() * 0.4,
      swayPhase: Math.random() * Math.PI * 2,
      color: emberIsGold ? "gold" : "accent",
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = particleCount();

    if (particles.length < target) {
      while (particles.length < target) particles.push(makeParticle());
    } else {
      particles.length = target;
    }
  }

  function drawStatic() {
    // Reduced-motion fallback: a single faint painterly wash, no animation.
    ctx.clearRect(0, 0, width, height);

    const rgb = hexToRgb(colors.accent);

    const gradient = ctx.createRadialGradient(
      width * 0.5, height * 0.35, 0,
      width * 0.5, height * 0.35, Math.max(width, height) * 0.7
    );

    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function step(time) {
    if (!running) return;

    ctx.clearRect(0, 0, width, height);

    // Ease the lantern position and visibility toward its target.
    lantern.x += (lantern.targetX - lantern.x) * 0.12;
    lantern.y += (lantern.targetY - lantern.y) * 0.12;
    lantern.fade += ((lantern.active ? 1 : 0) - lantern.fade) * 0.06;

    if (lantern.fade > 0.01) {
      const rgb = hexToRgb(colors.accent);

      const glow = ctx.createRadialGradient(
        lantern.x, lantern.y, 0,
        lantern.x, lantern.y, lantern.radius
      );

      glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.16 * lantern.fade})`);
      glow.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 * lantern.fade})`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glow;
      ctx.fillRect(
        lantern.x - lantern.radius,
        lantern.y - lantern.radius,
        lantern.radius * 2,
        lantern.radius * 2
      );
    }

    const goldRgb = hexToRgb(colors.gold);
    const accentRgb = hexToRgb(colors.accentSoft);

    for (const p of particles) {
      // Gentle upward drift with a horizontal sway, like rising embers.
      p.y += p.vy;
      p.x += p.vx + Math.sin(time * 0.001 * p.swaySpeed + p.swayPhase) * 0.03;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      // If the lantern is near, particles brighten and drift away from it.
      let alpha = p.baseAlpha;
      let drawRadius = p.radius;

      if (lantern.fade > 0.01) {
        const dx = p.x - lantern.x;
        const dy = p.y - lantern.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < lantern.radius) {
          const proximity = 1 - dist / lantern.radius;

          alpha = Math.min(1, alpha + proximity * 0.55 * lantern.fade);
          drawRadius = p.radius + proximity * 1.4;

          const push = proximity * 0.35 * lantern.fade;
          if (dist > 0.001) {
            p.x += (dx / dist) * push;
            p.y += (dy / dist) * push;
          }
        }
      }

      const rgb = p.color === "gold" ? goldRgb : accentRgb;

      ctx.beginPath();
      ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.8})`;
      ctx.shadowBlur = 4;
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    rafId = requestAnimationFrame(step);
  }

  function setLanternTarget(x, y) {
    lantern.targetX = x;
    lantern.targetY = y;
    lantern.active = true;
  }

  function start() {
    resize();

    if (reduceMotion) {
      drawStatic();
      return;
    }

    lantern.targetX = width / 2;
    lantern.targetY = height / 2;

    rafId = requestAnimationFrame(step);
  }

  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) drawStatic();
  });

  if (!reduceMotion) {
    window.addEventListener("mousemove", (e) => {
      setLanternTarget(e.clientX, e.clientY);
    });

    window.addEventListener("mouseleave", () => {
      lantern.active = false;
    });

    window.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches && e.touches[0]) {
          setLanternTarget(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;

      if (running && !rafId) {
        rafId = requestAnimationFrame(step);
      } else if (!running && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
  }

  // Re-read theme colors whenever the toggle flips.
  toggle.addEventListener("click", () => {
    colors = readColors();
    if (reduceMotion) drawStatic();
  });

  start();
})();