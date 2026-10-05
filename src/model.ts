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
// The language code is not enumerable, so tools that walk content for text see only the phrase.
export const tagged = (lang: string, text: string): Tagged => {
  const t = { text };
  Object.defineProperty(t, "lang", { value: lang, enumerable: false });
  return Object.freeze(t) as Tagged;
};
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

export function currentRole(c: Content): { stage: Stage; role: Role } {
  const stage = c.stages[c.stages.length - 1];
  const role = stage?.roles.find((r) => r.dates.end === "present");
  if (!stage || !role) throw new Error("No current role in the last stage");
  return { stage, role };
}
