export type Todo = { readonly todo: string };
export type Text = string | Todo;
// A Todo must never reach output. Any string or number coercion throws, so a Todo in a
// template literal, String(), join(), an attribute or JSON fails the build (AC-09, E-06).
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

export type YearMonth = { readonly year: number; readonly month: number }; // month 1..12
export type DateRange = { readonly start: YearMonth; readonly end: YearMonth | "present" | Todo };
export type StageId = 0 | 1 | 2 | 3;

// The allowed client descriptors of the spec (AC-25). Content can use no other value.
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
  readonly focus: Text; // short phrase for the telemetry FOCUS row
  readonly context: Text;
  readonly decision: Text;
  readonly outcome: Text;
  readonly details: readonly Text[]; // long bullets behind "Details"
  readonly clientRefs?: readonly ClientDescriptor[]; // allowed descriptors used in this role's text (AC-25)
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
  readonly tFocus: string;
  readonly current: string;
  readonly inView: string;
  readonly notStated: string;
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

export function teamSizeLabel(n: number | undefined): string | null {
  return n === undefined ? null : String(n);
}

export function currentRole(c: Content): { stage: Stage; role: Role } {
  const stage = c.stages[c.stages.length - 1];
  const role = stage?.roles.find((r) => r.dates.end === "present");
  if (!stage || !role) throw new Error("No current role in the last stage");
  return { stage, role };
}
