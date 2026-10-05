// Nav behaviour: active entry, Contents popover, click, focus and hash.
// The script sets "nav-ready" only after the button and the popover exist (R-05).
import { atMidline, onFrame } from "./scroll";
import { shownCard } from "./telemetry";

const POPOVER = "(max-width: 1279.98px)";
let button: HTMLButtonElement | null = null;
let mq: MediaQueryList | null = null;
let onMq: (() => void) | null = null;

// Below 1280 px the nav is a popover and the Contents button exists. At 1280 px and wider the rail shows and the button is removed.
function applyMode(nav: HTMLElement, bar: HTMLElement, narrow: boolean): void {
  if (narrow) {
    if (!nav.hasAttribute("popover")) nav.setAttribute("popover", "auto");
    if (!button) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "contents-btn";
      btn.textContent = bar.dataset.contents ?? "";
      btn.setAttribute("popovertarget", "nav");
      btn.setAttribute("aria-controls", "nav");
      btn.setAttribute("aria-expanded", "false");
      bar.append(btn);
      button = btn;
    }
    return;
  }
  try {
    nav.hidePopover();
  } catch {
    // Not open, or not a popover.
  }
  nav.removeAttribute("popover");
  button?.remove();
  button = null;
}

// Undo the nav set-up. Used after a start-up error, so the plain list shows.
export function stopNav(): void {
  const nav = document.getElementById("nav");
  if (mq && onMq) mq.removeEventListener("change", onMq);
  mq = null;
  onMq = null;
  if (nav) {
    try {
      nav.hidePopover();
    } catch {
      // Not open.
    }
    nav.removeAttribute("popover");
  }
  button?.remove();
  button = null;
  document.documentElement.classList.remove("nav-ready");
}

function byId(id: string): HTMLElement | null {
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
}

function headingOf(target: HTMLElement): HTMLElement {
  if (/^H[1-6]$/.test(target.tagName)) return target;
  return target.querySelector<HTMLElement>("h1, h2, h3") ?? target;
}

export function startNav(): void {
  const nav = document.getElementById("nav");
  const bar = document.getElementById("topbar");
  if (!nav || !bar) throw new Error("nav or topbar missing");
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];
  const link = (href: string) => links.find((a) => a.getAttribute("href") === href) ?? null;
  const cards = [...document.querySelectorAll<HTMLElement>("article.card")];
  const stages = [...document.querySelectorAll<HTMLElement>("section.stage")];
  const skills = document.getElementById("skills");
  const contact = document.getElementById("contact");
  const tail = [skills, contact].filter((e): e is HTMLElement => e !== null);

  mq = window.matchMedia(POPOVER);
  onMq = () => applyMode(nav, bar, mq!.matches);
  mq.addEventListener("change", onMq);
  applyMode(nav, bar, mq.matches);

  nav.addEventListener("toggle", (e) => {
    const open = (e as ToggleEvent).newState === "open";
    button?.setAttribute("aria-expanded", String(open));
    if (open) (nav.querySelector<HTMLElement>('a[aria-current="location"]') ?? links[0])?.focus();
  });

  // Active entry. The stage entry gets "location". The role entry of the card the panel shows gets "true".
  const update = () => {
    for (const a of links) a.removeAttribute("aria-current");
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const past = atMidline(tail);
    let stage: HTMLAnchorElement | null = null;
    let role: HTMLAnchorElement | null = null;
    if (window.scrollY <= 0) {
      stage = link("#top");
    } else if (atEnd && contact) {
      stage = link("#contact");
    } else if (past) {
      stage = link(`#${past.id}`);
    } else {
      // The stage is the one that holds the midline. The role is the card of the telemetry, if it sits in that stage.
      const section = atMidline(stages);
      stage = section ? link(`#${section.id}`) : link("#top");
      const card = shownCard() ?? atMidline(cards);
      if (card && section && card.closest("section.stage") === section) role = link(`#${card.id}-heading`);
    }
    stage?.setAttribute("aria-current", "location");
    role?.setAttribute("aria-current", "true");
  };
  onFrame(update);
  document.addEventListener("focusin", update);
  window.addEventListener("hashchange", update);
  update();

  // Click: scroll, then move focus to the heading. The hash changes with replaceState.
  nav.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href^='#']");
    if (!a || !nav.contains(a)) return;
    const raw = a.getAttribute("href")!.slice(1);
    const target = byId(raw);
    if (!target) return;
    e.preventDefault();
    try {
      nav.hidePopover();
    } catch {
      // Not a popover, or closed.
    }
    const heading = headingOf(target);
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
    history.replaceState(null, "", `#${raw}`);
    update();
  });

  document.documentElement.classList.add("nav-ready");
}
