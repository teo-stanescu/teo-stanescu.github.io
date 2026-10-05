// Telemetry panel updates (ADR 0002). Reads data-* attributes only.
const KEYS = ["stage", "role", "years", "team", "focus"] as const;
type Key = (typeof KEYS)[number];

export function startTelemetry(): void {
  const panel = document.querySelector<HTMLElement>(".telemetry");
  if (!panel) throw new Error("telemetry panel missing");
  const cards = [...document.querySelectorAll<HTMLElement>("article.card")];
  if (cards.length === 0) return;

  const { idle = "", active = "", dash = "", glyph = "" } = panel.dataset;
  const field = (k: string) => panel.querySelector<HTMLElement>(`[data-t="${k}"]`);
  const state = field("state");

  // Snapshot the prerendered idle values (the current role).
  const idleNodes = new Map<Key, Node[]>();
  for (const k of KEYS) {
    const el = field(k);
    if (el) idleNodes.set(k, [...el.childNodes].map((n) => n.cloneNode(true)));
  }

  const write = (k: Key, value: string) => {
    const el = field(k);
    if (!el) return;
    if (value) {
      el.textContent = value;
      return;
    }
    el.textContent = "";
    const g = document.createElement("span");
    g.setAttribute("aria-hidden", "true");
    g.textContent = glyph;
    const h = document.createElement("span");
    h.className = "visually-hidden";
    h.textContent = dash;
    el.append(g, h);
  };

  const setActive = (card: HTMLElement) => {
    const d = card.dataset;
    write("stage", d.stage ?? "");
    write("role", d.role ?? "");
    write("years", d.years ?? "");
    write("team", d.team ?? "");
    write("focus", d.focus ?? "");
    if (state) state.textContent = active;
  };

  const setIdle = () => {
    for (const [k, nodes] of idleNodes) {
      const el = field(k);
      if (!el) continue;
      el.textContent = "";
      el.append(...nodes.map((n) => n.cloneNode(true)));
    }
    if (state) state.textContent = idle;
  };

  // Ignore the observer after a hash match, until the first user input (D-05).
  let hashLocked = false;
  const unlock = () => {
    hashLocked = false;
    for (const t of ["wheel", "touchstart", "keydown", "focusin"] as const) {
      window.removeEventListener(t, unlock, true);
    }
  };
  const lock = () => {
    hashLocked = true;
    for (const t of ["wheel", "touchstart", "keydown", "focusin"] as const) {
      window.addEventListener(t, unlock, { capture: true, once: true });
    }
  };

  const midlineIdle = () => cards[0].getBoundingClientRect().top > window.innerHeight / 2;

  if (typeof IntersectionObserver === "undefined") throw new Error("no IntersectionObserver");
  const io = new IntersectionObserver(
    (entries) => {
      if (hashLocked) return;
      const hit = entries.filter((e) => e.isIntersecting).pop();
      if (hit) setActive(hit.target as HTMLElement);
      else if (midlineIdle()) setIdle();
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  for (const c of cards) io.observe(c);

  document.addEventListener("focusin", (e) => {
    const card = (e.target as Element | null)?.closest?.<HTMLElement>("article.card");
    if (card) setActive(card);
  });

  const fromHash = () => {
    const raw = location.hash.slice(1);
    if (!raw) return;
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const card = target.matches("article.card")
      ? target
      : (target.closest<HTMLElement>("article.card") ?? target.querySelector<HTMLElement>("article.card"));
    if (!card) return;
    setActive(card);
    lock();
  };

  window.addEventListener("hashchange", fromHash);
  fromHash();
}
