// Page search: combobox with a result list, in-place highlights and Next/Previous.
// Every node is built with createElement and textContent. The query is never a pattern,
// never markup, and never leaves the page: no URL, no storage, no request.
import { buildIndex, type Block } from "./search-index";
import { fold, normalizeQuery, findAll, locate, MAX_HIGHLIGHTS, type Folded } from "./search-core";
import { createScheduler } from "./scroll";

const MAX_OPTIONS = 8;
const SNIPPET = 80;
const ELLIPSIS = "…";
const PHONE = "(max-width: 767.98px)";
const GROUP = "article.card, section, header.hero, footer";

interface Group {
  el: HTMLElement;
  heading: HTMLElement;
  name: string;
}
interface Doc {
  block: Block;
  f: Folded;
  group: Group;
}
interface Match {
  doc: Doc;
  start: number;
  end: number;
}
interface Hit {
  group: Group;
  first: number;
}

// The one state object.
const state = {
  query: "",
  matches: [] as Match[],
  active: -1,
  listOpen: false,
  opened: new Set<HTMLDetailsElement>(),
  hits: [] as Hit[],
  more: 0,
  sel: -1,
  short: false, // A query of one character: the list holds only the hint.
};

interface Ui {
  root: HTMLElement;
  toggle: HTMLButtonElement;
  field: HTMLElement;
  input: HTMLInputElement;
  count: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  pop: HTMLElement;
  list: HTMLElement;
  note: HTMLElement;
  more: HTMLElement;
}

let ui: Ui | null = null;
let docs: Doc[] = [];
let labels = { noMatches: "", of: "", more: "", shortQuery: "" };
let prevFocus: HTMLElement | null = null;
let dirty = false;
let schedule: (() => void) | null = null;
let onKey: ((e: KeyboardEvent) => void) | null = null;
let onNavToggle: ((e: Event) => void) | null = null;

const canHighlight = (): boolean =>
  typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function button(cls: string, label: string, glyph: string): HTMLButtonElement {
  const b = el("button", cls);
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.title = label;
  b.textContent = glyph;
  return b;
}

// A magnifier drawn by CSS, so the script holds no SVG namespace URL.
function icon(): HTMLSpanElement {
  const i = el("span", "search-icon");
  i.setAttribute("aria-hidden", "true");
  return i;
}

function groupOf(node: Element): Group {
  const el = (node.closest<HTMLElement>(GROUP) ?? node) as HTMLElement;
  const heading = el.querySelector<HTMLElement>("h1, h2, h3") ?? el;
  return { el, heading, name: (heading.textContent ?? "").trim() };
}

function buildDocs(): Doc[] {
  const groups = new Map<Element, Group>();
  return buildIndex(document).map((block) => {
    const host = block.el.closest(GROUP) ?? block.el;
    let group = groups.get(host);
    if (!group) {
      group = groupOf(block.el);
      groups.set(host, group);
    }
    return { block, f: fold(block.text), group };
  });
}

function rangesOf(m: Match): Range[] {
  const { block, f } = m.doc;
  return locate(f.map, block.segLengths, m.start, m.end).map((p) => {
    const r = document.createRange();
    r.setStart(block.nodes[p.seg], p.from);
    r.setEnd(block.nodes[p.seg], p.to);
    return r;
  });
}

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---- Highlights -----------------------------------------------------------

function clearHighlights(): void {
  if (!canHighlight()) return;
  CSS.highlights.delete("search-all");
  CSS.highlights.delete("search-active");
}

function paintAll(): void {
  if (!canHighlight()) return;
  const all = new Highlight();
  for (const m of state.matches.slice(0, MAX_HIGHLIGHTS)) for (const r of rangesOf(m)) all.add(r);
  CSS.highlights.set("search-all", all);
}

function paintActive(): void {
  if (!canHighlight()) return;
  const m = state.matches[state.active];
  if (!m) {
    CSS.highlights.delete("search-active");
    return;
  }
  const h = new Highlight(...rangesOf(m));
  h.priority = 1;
  CSS.highlights.set("search-active", h);
}

// ---- Counter and buttons --------------------------------------------------

function updateCounter(): void {
  if (!ui) return;
  const n = state.matches.length;
  // The short-query hint goes into this polite live region, so a screen reader announces it.
  ui.count.textContent = state.short
    ? labels.shortQuery
    : state.query === ""
      ? ""
      : `${n === 0 ? 0 : state.active + 1} ${labels.of} ${n}`;
  const off = n === 0;
  ui.prev.disabled = off;
  ui.next.disabled = off;
}

// ---- List -----------------------------------------------------------------

function setSel(i: number): void {
  if (!ui) return;
  const opts = ui.list.children;
  for (let k = 0; k < opts.length; k++) opts[k].setAttribute("aria-selected", String(k === i));
  state.sel = i;
  if (i >= 0) {
    ui.input.setAttribute("aria-activedescendant", opts[i].id);
    opts[i].scrollIntoView({ block: "nearest" });
  } else {
    ui.input.removeAttribute("aria-activedescendant");
  }
}

function closeList(): void {
  if (!ui) return;
  state.listOpen = false;
  ui.pop.hidden = true;
  ui.input.setAttribute("aria-expanded", "false");
  setSel(-1);
}

function hidePopovers(): void {
  const nav = document.getElementById("nav");
  if (nav && nav.hasAttribute("popover")) {
    try {
      nav.hidePopover();
    } catch {
      // Not open.
    }
  }
}

function openList(): void {
  if (!ui) return;
  if (state.query === "" && !state.short) return;
  const hasNote = state.matches.length === 0 || state.more > 0;
  if (state.hits.length === 0 && !hasNote) return;
  hidePopovers(); // One popover or list at a time.
  state.listOpen = true;
  ui.pop.hidden = false;
  ui.list.hidden = state.hits.length === 0;
  ui.input.setAttribute("aria-expanded", String(state.hits.length > 0));
  fitList();
}

// Show only the options that fit the window height. The "and N more" note counts the rest.
// A short window has no scroll to reach a clipped option, because the bar is fixed.
function fitList(): void {
  if (!ui || ui.pop.hidden || state.hits.length === 0) return;
  const opts = ui.list.children;
  const room = (): boolean => ui!.pop.getBoundingClientRect().bottom <= window.innerHeight;
  // Restore the full set first, so a taller window shows more again.
  const total = Math.min(state.hits.length, MAX_OPTIONS);
  const sel = state.sel;
  if (opts.length < total) renderOptions(total);
  while (opts.length > 1 && !room()) opts[opts.length - 1].remove();
  setMore(state.hits.length - opts.length);
  setSel(sel < opts.length ? sel : -1);
}

function setMore(n: number): void {
  if (!ui) return;
  ui.more.hidden = n <= 0;
  ui.more.textContent = n > 0 ? labels.more.replace("{n}", String(n)) : "";
}

function snippetParts(m: Match): [string, string, string] {
  const { text } = m.doc.block;
  const map = m.doc.f.map;
  const s = map[m.start];
  const e = Math.max(m.end < map.length ? map[m.end] : text.length, map[m.end - 1] + 1);
  const hit = text.slice(s, e).replace(/\s+/g, " ").slice(0, SNIPPET);
  const room = SNIPPET - hit.length;
  const bBudget = Math.floor(room / 2);
  const aBudget = room - bBudget;
  let before = "";
  let after = "";
  if (bBudget > 0) {
    const from = s - bBudget;
    before = from > 0 && bBudget > 1 ? ELLIPSIS + text.slice(from + 1, s) : text.slice(Math.max(0, from), s);
  }
  if (aBudget > 0) {
    const to = e + aBudget;
    after = to < text.length && aBudget > 1 ? text.slice(e, to - 1) + ELLIPSIS : text.slice(e, to);
  }
  return [before.replace(/\s+/g, " "), hit, after.replace(/\s+/g, " ")];
}

function renderOptions(count: number): void {
  if (!ui) return;
  ui.list.replaceChildren();
  state.hits.slice(0, count).forEach((h, i) => {
    const opt = el("div", "search-opt");
    opt.id = `search-opt-${i}`;
    opt.setAttribute("role", "option");
    opt.setAttribute("aria-selected", "false");
    opt.dataset.hit = String(i);
    const title = el("span", "search-opt-title");
    title.textContent = h.group.name;
    const snip = el("span", "search-opt-snip");
    const [before, hit, after] = snippetParts(state.matches[h.first]);
    const mark = el("mark", "search-opt-mark");
    mark.textContent = hit;
    snip.append(before, mark, after);
    opt.append(title, snip);
    ui!.list.append(opt);
  });
}

function renderList(): void {
  if (!ui) return;
  renderOptions(MAX_OPTIONS);
  ui.note.hidden = state.matches.length > 0;
  ui.note.textContent = state.matches.length > 0 ? "" : labels.noMatches;
  ui.more.hidden = state.more === 0;
  ui.more.textContent = state.more > 0 ? labels.more.replace("{n}", String(state.more)) : "";
}

// ---- Scan -----------------------------------------------------------------

function scan(): void {
  if (!ui) return;
  dirty = false;
  const q = normalizeQuery(ui.input.value);
  state.query = q ?? "";
  state.matches = [];
  state.hits = [];
  state.more = 0;
  state.active = -1;
  setSel(-1);
  clearHighlights();
  state.short = false;
  if (q === null) {
    // Under 2 characters: empty the list, so no stale option stays, and show the hint.
    ui.list.replaceChildren();
    ui.more.hidden = true;
    ui.more.textContent = "";
    state.short = ui.input.value.trim() !== "";
    ui.note.hidden = !state.short;
    ui.note.textContent = state.short ? labels.shortQuery : "";
    updateCounter();
    if (state.short) openList();
    else closeList();
    return;
  }
  const seen = new Map<Group, number>();
  for (const doc of docs) {
    for (const r of findAll(doc.f.folded, q, Infinity).ranges) {
      if (!seen.has(doc.group)) seen.set(doc.group, state.matches.length);
      state.matches.push({ doc, start: r.start, end: r.end });
    }
  }
  state.hits = [...seen].map(([group, first]) => ({ group, first }));
  state.more = Math.max(0, state.hits.length - MAX_OPTIONS);
  state.active = state.matches.length > 0 ? 0 : -1;
  paintAll();
  paintActive();
  renderList();
  updateCounter();
  openList();
  if (state.matches.length > 0) reveal(state.matches[0]);
}

function flush(): void {
  if (dirty) scan();
}

// ---- Jumps ----------------------------------------------------------------

// Open every closed Details around `node`. Remember the ones the search opened.
function openDetails(node: Node): void {
  let d = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest("details");
  while (d) {
    if (!d.open) {
      d.open = true;
      state.opened.add(d);
    }
    d = d.parentElement?.closest("details") ?? null;
  }
}

function setActive(i: number, jump: boolean): void {
  const n = state.matches.length;
  if (n === 0) return;
  state.active = ((i % n) + n) % n;
  const m = state.matches[state.active];
  paintActive();
  updateCounter();
  if (!jump) return;
  closeList();
  reveal(m);
}

// Open the Details around a match and scroll it into view.
function reveal(m: Match): void {
  openDetails(m.doc.block.nodes[0]);
  const r = rangesOf(m)[0];
  if (!r) return;
  const rect = r.getBoundingClientRect();
  if (rect.top < 96 || rect.bottom > window.innerHeight - 48) {
    window.scrollTo({
      top: window.scrollY + rect.top - window.innerHeight * 0.35,
      behavior: reduceMotion() ? "instant" : "smooth",
    });
  }
}

function step(delta: number): void {
  flush();
  if (state.matches.length === 0) return;
  setActive(state.active + delta, true);
}

function choose(i: number): void {
  flush(); // A scan queued by the last key must not reopen the list after the jump.
  const h = state.hits[i];
  if (!h) return;
  closeList();
  setActive(h.first, false);
  openDetails(state.matches[h.first].doc.block.nodes[0]);
  const heading = h.group.heading;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.scrollIntoView({ behavior: reduceMotion() ? "instant" : "smooth", block: "start" });
  heading.focus({ preventScroll: true });
}

// ---- Clear ----------------------------------------------------------------

function clear(restore: boolean): void {
  if (!ui) return;
  ui.input.value = "";
  dirty = false;
  state.query = "";
  state.matches = [];
  state.hits = [];
  state.more = 0;
  state.short = false;
  state.active = -1;
  clearHighlights();
  closeList();
  ui.list.replaceChildren();
  ui.note.textContent = "";
  ui.more.textContent = "";
  updateCounter();
  for (const d of state.opened) d.open = false;
  state.opened.clear();
  ui.root.removeAttribute("data-open");
  ui.toggle.setAttribute("aria-expanded", "false");
  if (restore) {
    const back = prevFocus;
    prevFocus = null;
    if (back && back.isConnected && back.checkVisibility()) back.focus();
    else if (window.matchMedia(PHONE).matches) ui.toggle.focus(); // The row is closed: the button opened it.
    else if (back) ui.input.focus(); // The earlier element is gone: stay in the search field.
    else if (document.activeElement && ui.root.contains(document.activeElement)) ui.input.blur();
    else if (document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("tabindex")) {
      document.activeElement.blur();
    }
  }
}

function active(): boolean {
  return state.query !== "" || state.listOpen;
}

// ---- Keys -----------------------------------------------------------------

function typing(t: Element | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable;
}

function openRow(): void {
  if (!ui) return;
  if (window.matchMedia(PHONE).matches) {
    ui.root.setAttribute("data-open", "");
    ui.toggle.setAttribute("aria-expanded", "true");
  }
  ui.input.focus();
}

function inputKey(e: KeyboardEvent): void {
  if (!ui) return;
  const opts = ui.list.children.length;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp": {
      e.preventDefault();
      flush();
      if (!state.listOpen && !state.short) openList();
      if (opts === 0) return;
      const d = e.key === "ArrowDown" ? 1 : -1;
      setSel(state.sel < 0 ? (d > 0 ? 0 : opts - 1) : (state.sel + d + opts) % opts);
      return;
    }
    case "Enter":
      e.preventDefault();
      flush();
      if (state.listOpen && state.sel >= 0) choose(state.sel);
      else step(e.shiftKey ? -1 : 1);
      return;
    case "Escape":
      e.preventDefault();
      e.stopPropagation();
      flush(); // Close the list of the current query, not of a stale one.
      if (state.listOpen) closeList();
      else clear(true);
      return;
  }
}

function build(bar: HTMLElement): Ui {
  const d = bar.dataset;
  const root = el("div", "search");
  root.setAttribute("role", "search");
  root.setAttribute("aria-label", d.search ?? "");

  const toggle = el("button", "search-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-label", d.search ?? "");
  toggle.setAttribute("aria-controls", "search-field");
  toggle.setAttribute("aria-expanded", "false");
  toggle.append(icon());

  const field = el("div", "search-field");
  field.id = "search-field";
  const input = el("input", "search-input");
  input.type = "text";
  input.id = "search-input";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", d.placeholderTouch ?? "");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "search-list");
  input.setAttribute("aria-autocomplete", "list");
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "none");
  input.setAttribute("enterkeyhint", "search");
  // Touch devices and the phone layout have no "/" key hint.
  const hints = [window.matchMedia("(hover: none)"), window.matchMedia(PHONE)];
  const setHint = () => {
    input.placeholder = (hints.some((m) => m.matches) ? d.placeholderTouch : d.placeholder) ?? "";
  };
  setHint();
  for (const m of hints) m.addEventListener("change", setHint);

  const count = el("span", "search-count");
  count.setAttribute("aria-live", "polite");
  const prev = button("search-prev", d.previous ?? "", "↑");
  const next = button("search-next", d.next ?? "", "↓");
  prev.disabled = true;
  next.disabled = true;

  const pop = el("div", "search-pop");
  pop.hidden = true;
  const list = el("div", "search-list");
  list.id = "search-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", d.results ?? "");
  list.hidden = true;
  const note = el("p", "search-note");
  note.hidden = true;
  const more = el("p", "search-note");
  more.hidden = true;
  pop.append(list, note, more);

  field.append(input, count, prev, next, pop);
  root.append(toggle, field);
  labels = {
    noMatches: d.noMatches ?? "",
    of: d.of ?? "",
    more: d.more ?? "",
    shortQuery: d.shortQuery ?? "",
  };
  return { root, toggle, field, input, count, prev, next, pop, list, note, more };
}

export function startSearch(): void {
  const bar = document.getElementById("topbar");
  if (!bar) throw new Error("topbar missing");
  docs = buildDocs();
  const u = build(bar);
  ui = u;
  schedule = createScheduler((cb) => requestAnimationFrame(cb), flush);

  u.input.addEventListener("input", () => {
    dirty = true;
    schedule?.();
  });
  u.input.addEventListener("keydown", inputKey);
  u.root.addEventListener("focusin", (e) => {
    const from = (e as FocusEvent).relatedTarget as Node | null;
    if (!from || !u.root.contains(from)) prevFocus = from as HTMLElement | null;
  });
  u.root.addEventListener("focusout", (e) => {
    const to = (e as FocusEvent).relatedTarget as Node | null;
    if (!to || !u.root.contains(to)) closeList();
  });
  u.input.addEventListener("click", () => {
    if (!state.listOpen && state.query !== "") openList();
  });
  u.pop.addEventListener("mousedown", (e) => e.preventDefault());
  u.list.addEventListener("click", (e) => {
    const opt = (e.target as Element).closest<HTMLElement>("[data-hit]");
    if (opt) choose(Number(opt.dataset.hit));
  });
  u.prev.addEventListener("click", () => step(-1));
  u.next.addEventListener("click", () => step(1));
  u.toggle.addEventListener("click", () => {
    if (u.root.hasAttribute("data-open")) clear(true);
    else {
      prevFocus = u.toggle; // The button is the earlier element when it opens the row.
      openRow();
    }
  });

  onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (e.key === "/" && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (typing(document.activeElement)) return;
      e.preventDefault();
      openRow();
      return;
    }
    if (e.key === "Escape" && active()) {
      const nav = document.getElementById("nav");
      try {
        if (nav?.matches(":popover-open")) return;
      } catch {
        // No :popover-open support.
      }
      const a = document.activeElement;
      if (a === document.body || a === null || u.root.contains(a) || a === state.matches[state.active]?.doc.group.heading) {
        clear(true);
      }
    }
  };
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", () => {
    if (state.listOpen) fitList();
  });

  onNavToggle = (e) => {
    if ((e as ToggleEvent).newState === "open") closeList();
  };
  document.getElementById("nav")?.addEventListener("toggle", onNavToggle);

  bar.prepend(u.root);
  document.documentElement.classList.add("search-ready");
}

// Undo the search set-up. Used after a start-up error, so the static page stays complete.
export function stopSearch(): void {
  if (onKey) document.removeEventListener("keydown", onKey);
  if (onNavToggle) document.getElementById("nav")?.removeEventListener("toggle", onNavToggle);
  onKey = null;
  onNavToggle = null;
  clearHighlights();
  for (const d of state.opened) d.open = false;
  state.opened.clear();
  ui?.root.remove();
  ui = null;
  docs = [];
  document.documentElement.classList.remove("search-ready");
}
