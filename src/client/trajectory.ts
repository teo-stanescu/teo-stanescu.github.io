// Scroll-linked trajectory line (ADR 0002). Runs in the shared scroll frame.
import { onFrame } from "./scroll";

export function startTrajectory(): void {
  const root = document.documentElement;
  onFrame(() => {
    const range = root.scrollHeight - window.innerHeight;
    const raw = range > 0 ? window.scrollY / range : 0;
    const progress = Math.min(1, Math.max(0, raw));
    root.style.setProperty("--progress", String(progress));
    // The tip plane moves by transform: progress times the height of main.
    const main = document.getElementById("main");
    if (main) root.style.setProperty("--main-h", `${main.offsetHeight}px`);
    const mid = window.innerHeight / 2;
    for (const stage of document.querySelectorAll<HTMLElement>(".stage")) {
      const h2 = stage.querySelector("h2");
      if (!h2) continue;
      stage.classList.toggle("reached", h2.getBoundingClientRect().top < mid);
    }
  });
}
