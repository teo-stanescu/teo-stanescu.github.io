// One scroll scheduler and one midline rule for the trajectory, the telemetry and the nav.
interface Rect {
  top: number;
  bottom: number;
}

// The rect under the midline. Between rects, the last rect above it. Above the first rect: -1.
export function pickAtMidline(rects: readonly Rect[], mid: number): number {
  let current = -1;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (r.top > mid) break;
    current = i;
    if (r.bottom > mid) break;
  }
  return current;
}

export function atMidline(els: readonly HTMLElement[]): HTMLElement | null {
  const mid = window.innerHeight / 2;
  const i = pickAtMidline(
    els.map((e) => e.getBoundingClientRect()),
    mid,
  );
  return i < 0 ? null : els[i];
}

// Returns a function that queues `run` for the next frame. Calls in one burst queue one frame.
export function createScheduler(raf: (cb: () => void) => unknown, run: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    raf(() => {
      queued = false;
      run();
    });
  };
}

const subscribers: (() => void)[] = [];
let schedule: (() => void) | null = null;

// Subscribers run once per animation frame after scroll or resize, and once at start-up.
export function onFrame(fn: () => void): void {
  subscribers.push(fn);
}

export function startScroll(): () => void {
  if (!schedule) {
    schedule = createScheduler(
      (cb) => requestAnimationFrame(cb),
      () => {
        for (const fn of subscribers) fn();
      },
    );
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
  }
  schedule();
  return schedule;
}
