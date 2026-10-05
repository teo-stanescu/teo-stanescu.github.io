// Role facts written by hand from the brief. Do not generate this table from src/content.ts.
export type BriefEnd = { year: number; month: number } | "present" | "open";
export interface BriefFact {
  id: string;
  start: { year: number; month: number };
  end: BriefEnd; // "open" = the brief gives no end date (Hyperpanda)
  teamSize?: number;
}

export const BRIEF_FACTS: readonly BriefFact[] = [
  { id: "education", start: { year: 2014, month: 9 }, end: { year: 2018, month: 7 } },
  { id: "capgemini", start: { year: 2018, month: 4 }, end: { year: 2021, month: 2 } },
  { id: "hyperpanda", start: { year: 2017, month: 10 }, end: "open" },
  { id: "spark-agency", start: { year: 2020, month: 1 }, end: { year: 2021, month: 12 } },
  { id: "digital-developer", start: { year: 2021, month: 3 }, end: { year: 2022, month: 2 } },
  { id: "tech-lead", start: { year: 2022, month: 2 }, end: { year: 2023, month: 2 }, teamSize: 5 },
  { id: "solution-architect", start: { year: 2023, month: 2 }, end: { year: 2024, month: 3 }, teamSize: 6 },
  { id: "principal-engineer", start: { year: 2024, month: 3 }, end: "present", teamSize: 12 },
];
