// Scroll-linked trajectory line (ADR 0002). One rAF per frame at most.
export function startTrajectory(): void {
  const root = document.documentElement;
  let queued = false;

  const frame = () => {
    queued = false;
    const range = root.scrollHeight - window.innerHeight;
    const raw = range > 0 ? window.scrollY / range : 0;
    const progress = Math.min(1, Math.max(0, raw));
    root.style.setProperty("--progress", String(progress));
    const mid = window.innerHeight / 2;
    for (const stage of document.querySelectorAll<HTMLElement>(".stage")) {
      const h2 = stage.querySelector("h2");
      if (!h2) continue;
      stage.classList.toggle("reached", h2.getBoundingClientRect().top < mid);
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}
