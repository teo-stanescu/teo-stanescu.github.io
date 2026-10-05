export type Todo = { readonly todo: string };
export type Text = string | Todo;
// A Todo must never reach output. Any string or number coercion throws, so a Todo in a
// template literal, String(), join(), an attribute or JSON fails the build, so a missing fact never reaches the page.
export const todo = (note: string): Todo => {
  const fail = (): never => {
    throw new Error(`Todo reached output: ${note}`);
  };
  const t = { todo: note };
  for (const k of ["toString", "valueOf", "toJSON", Symbol.toPrimitive]) {
    Object.defineProperty(t, k, { value: fail, enumerable: false });
  }
  return Object.freeze(t);
};
export const present = (t: Text | undefined): t is string =>
  typeof t === "string" && t.length > 0;

// A detail bullet can mix plain text with a phrase in another language (WCAG 3.1.2).
export type Run = string | Tagged;
export type Tagged = { readonly text: string; readonly lang: string };
export const tagged = (lang: string, text: string): Tagged => Object.freeze({ text, lang });
export const isTagged = (r: Run): r is Tagged => typeof r !== "string";
export type Rich = { readonly runs: readonly Run[] };
export type Detail = Text | Rich;
export const isRich = (d: Detail): d is Rich => typeof d === "object" && "runs" in d;
export const presentDetail = (d: Detail): d is string | Rich => isRich(d) || present(d);

export type YearMonth = { readonly year: number; readonly month: number }; // month 1..12
export type DateRange = { readonly start: YearMonth; readonly end: YearMonth | "present" | Todo };
export type StageId = 0 | 1 | 2 | 3;

// The only wording allowed for a client in public text. Content can use no other value.
export const CLIENT_DESCRIPTORS = [
  "some of the largest banking and insurance customers, mostly in the UK and Europe",
  "American customers",
  "UK and European ones",
  "FintechOS's largest customer",
  "a banking client",
  "a second client",
] as const;
export type ClientDescriptor = (typeof CLIENT_DESCRIPTORS)[number];

export interface Role {
  readonly id: string; // kebab-case, unique; also the article id
  readonly title: string; // h3 text
  readonly org: Text; // employer or school with place, from the brief
  readonly dates: DateRange;
  readonly teamSize?: number; // only 12, 6, 5 where the brief gives it
  readonly teamSizeUpTo?: true; // the brief says "up to": the label adds the words from Labels.upTo
  readonly focus: Text; // short phrase for the telemetry FOCUS row
  readonly context: Text;
  readonly decision: Text;
  readonly outcome: Text;
  readonly details: readonly Detail[]; // long bullets behind "Details"
  readonly clientRefs?: readonly ClientDescriptor[]; // allowed descriptors used in this role's text
}

export interface Stage {
  readonly id: StageId;
  readonly heading: string; // "Stage 0 - Pre-launch"
  readonly label: string; // mono label above the h2
  readonly telemetryName: string; // "0 - Pre-launch" for the STAGE row
  readonly roles: readonly Role[];
}

export interface SkillGroup {
  readonly name: string;
  readonly items: readonly Text[];
}

export interface Labels {
  readonly skip: string;
  readonly eyebrow: string;
  readonly cv: string;
  readonly github: string;
  readonly email: string;
  readonly context: string;
  readonly decision: string;
  readonly outcome: string;
  readonly details: string;
  readonly skills: string;
  readonly languages: string;
  readonly contact: string;
  readonly telemetry: string;
  readonly tStage: string;
  readonly tRole: string;
  readonly tYears: string;
  readonly tTeam: string;
  readonly upTo: string;
  readonly tFocus: string;
  readonly current: string;
  readonly inView: string;
  readonly notStated: string;
  readonly dash: string;
  readonly present: string;
  readonly navTop: string;
  readonly navSkills: string;
  readonly search: string;
  readonly contents: string;
  readonly placeholder: string;
  readonly placeholderTouch: string;
  readonly noMatches: string;
  readonly of: string;
  readonly next: string;
  readonly previous: string;
  readonly results: string;
  readonly more: string;
}

export interface Content {
  readonly person: {
    readonly name: string;
    readonly title: string;
    readonly location: string;
    readonly email: string;
    readonly summary: string;
    readonly positioning: Text;
  };
  readonly seo: { readonly title: string; readonly description: string };
  readonly stages: readonly Stage[];
  readonly skills: readonly SkillGroup[];
  readonly languages: readonly string[];
  readonly labels: Labels;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatYearMonth(ym: YearMonth): string {
  if (!Number.isInteger(ym.month) || ym.month < 1 || ym.month > 12) {
    throw new Error(`Invalid month ${ym.month}: expected 1 to 12`);
  }
  return `${MONTHS[ym.month - 1]} ${ym.year}`;
}

export function formatRange(r: DateRange, presentLabel = "Present"): string {
  const start = formatYearMonth(r.start);
  if (r.end === "present") return `${start} – ${presentLabel}`;
  if ("todo" in r.end) return start;
  return `${start} – ${formatYearMonth(r.end)}`;
}

export function teamSizeLabel(n: number | undefined, upTo?: string): string | null {
  if (n === undefined) return null;
  return upTo ? `${upTo} ${n}` : String(n);
}

// Sort key reads `start` and the string "present" only. It never coerces `end`, which may be a todo().
const isCurrent = (r: Role): boolean => r.dates.end === "present";

export function sortRoles(roles: readonly Role[]): readonly Role[] {
  return [...roles].sort((a, b) => {
    const ca = isCurrent(a);
    const cb = isCurrent(b);
    if (ca !== cb) return ca ? -1 : 1;
    return b.dates.start.year - a.dates.start.year || b.dates.start.month - a.dates.start.month;
  });
}

export function orderedStages(c: Content): readonly Stage[] {
  return [...c.stages].sort((a, b) => b.id - a.id).map((s) => ({ ...s, roles: sortRoles(s.roles) }));
}

export function currentRole(c: Content): { stage: Stage; role: Role } {
  const pairs = c.stages
    .flatMap((s) => s.roles.map((role) => ({ stage: s, role })))
    .filter((p) => p.role.dates.end === "present");
  const [only] = pairs;
  if (pairs.length !== 1 || !only) throw new Error("Expected exactly one current role");
  return only;
}
