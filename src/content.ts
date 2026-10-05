import { tagged, todo, type Content } from "./model";

export const content: Content = {
  person: {
    name: "Teodor Stanescu",
    title: "Principal Engineer",
    location: "Bucharest, Romania",
    email: "teo.st95@gmail.com",
    summary: "Principal engineer with 8+ years in software engineering, more than five of them on the FintechOS platform for banking and insurance customers. Progressed from developer to tech lead, solution architect and principal engineer: leading teams of up to 12, owning platform upgrades and architecture for some of the largest customers, and contributing to company initiatives such as AI adoption and product feature improvement. Combines hands-on engineering depth with architectural judgement, customer partnership and people leadership.",
    positioning:
      "5+ years on banking and insurance platforms, now looking for AI-focused engineering and architecture roles.",
  },
  seo: {
    title: "Teodor Stanescu - Principal Engineer",
    description:
      "Principal engineer with 8+ years in software engineering, more than five of them on the FintechOS platform for banking and insurance customers.",
  },
  stages: [
    {
      id: 0,
      heading: "Stage 0 - Pre-launch",
      label: "Education",
      telemetryName: "0 - Pre-launch",
      roles: [
        {
          id: "education",
          title: "Education",
          org: "Universitatea \"Politehnica\" Bucuresti",
          dates: { start: { year: 2014, month: 9 }, end: { year: 2018, month: 7 } },
          focus: "Aerospace Engineering",
          context: "Bachelor of Science in Aerospace Engineering, Universitatea \"Politehnica\" Bucuresti.",
          decision:
            "Erasmus+ semester, Aerospace Engineering, Hochschule Bremen. Contacted several German universities myself to find one interested in a partnership.",
          outcome: todo("the brief states no outcome of the degree or the Erasmus+ semester"),
          details: [
            {
              runs: [
                "Erasmus+ semester, Aerospace Engineering (\"",
                tagged("de", "Luft- und Raumfahrt Ingenieurwissenschaften"),
                "\"), Hochschule Bremen, September 2016 - February 2017.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: 1,
      heading: "Stage 1 - Test flights",
      label: "Early career",
      telemetryName: "1 - Test flights",
      roles: [
        {
          id: "capgemini",
          title: "Software Test Engineer",
          org: "Capgemini, Bucharest",
          dates: { start: { year: 2018, month: 4 }, end: { year: 2021, month: 2 } },
          focus: "Manual and automated testing",
          context: "Manual and automated testing for two clients.",
          decision:
            "For a banking client: black-box testing of 20+ financial applications, test case design and execution, mentoring new colleagues.",
          outcome: todo("the brief states no outcome for this role"),
          details: [
            "For a second client: Robot Framework automation for web APIs and databases, plus JMeter, SoapUI, Postman and Swagger.",
          ],
          clientRefs: ["a banking client", "a second client"],
        },
        {
          id: "hyperpanda",
          title: "Founder, Full Stack Developer",
          org: "Hyperpanda, Bucharest",
          dates: { start: { year: 2017, month: 10 }, end: todo("confirm whether still active") },
          focus: "Web and mobile projects",
          context: "Founded my own company and delivered web and mobile projects across different stacks.",
          decision:
            "Projects included Angular/Ionic, React Native, ReactJS and NodeJS, and a networking app built on a neo4j graph database.",
          outcome: todo("the brief states no outcome for this role"),
          details: [],
        },
        {
          id: "spark-agency",
          title: "Full Stack Developer",
          org: "The Spark Agency Inc., St. Louis, Missouri",
          dates: { start: { year: 2020, month: 1 }, end: { year: 2021, month: 12 } },
          focus: "Full stack development",
          context: "Maintained and extended \"Okapi\", a multi-environment web application.",
          decision:
            "Handled bug fixing, environment management, feasibility analysis and implementation of new features, working with redux-toolkit, Apollo GraphQL, sequelize, ESLint and database migrations.",
          outcome: todo("the brief states no outcome for this role"),
          details: [
            "ReactJS web apps and PWAs, a NodeJS API in Docker, PostgreSQL on AWS RDS.",
          ],
        },
      ],
    },
    {
      id: 2,
      heading: "Stage 2 - Ascent",
      label: "FintechOS",
      telemetryName: "2 - Ascent",
      roles: [
        {
          id: "digital-developer",
          title: "Digital Developer",
          org: "FintechOS, Bucharest, Romania",
          dates: { start: { year: 2021, month: 3 }, end: { year: 2022, month: 2 } },
          focus: "Full stack development on the FintechOS platform",
          context: "Full stack development on the FintechOS platform in a fast-paced, high-performance environment.",
          decision: "Covered technical analysis, implementation and maintenance of new features.",
          outcome:
            "Built a complete Internet Banking product from scratch in 9 months while also supporting delivery for a client implementation.",
          details: ["Technologies: JS, SQL Server, Azure, FintechOS Platform."],
        },
        {
          id: "tech-lead",
          title: "Tech Lead",
          org: "FintechOS, Bucharest, Romania",
          dates: { start: { year: 2022, month: 2 }, end: { year: 2023, month: 2 } },
          teamSize: 5,
          focus: "Productized accelerators for banking",
          context:
            "Productized accelerators for banking: reusable, ready-to-deploy solution components that shorten banking implementations on the FintechOS platform.",
          decision: "Led a team of 5 developers building productized accelerators for banking.",
          outcome: todo("the brief states no outcome for this role"),
          details: [],
        },
      ],
    },
    {
      id: 3,
      heading: "Stage 3 - Orbit",
      label: "FintechOS",
      telemetryName: "3 - Orbit",
      roles: [
        {
          id: "solution-architect",
          title: "Solution Architect",
          org: "FintechOS, Bucharest, Romania",
          dates: { start: { year: 2023, month: 2 }, end: { year: 2024, month: 3 } },
          teamSize: 6,
          teamSizeUpTo: true,
          focus: "Solution architecture and customer partnership",
          context:
            "Solution architect for around five of FintechOS's largest customers. After leading a team of developers, my role shifted from hands-on coding and code reviews towards end-to-end solutioning of customer problems, architecture and strategic positioning, while keeping the relationship with the customer healthy.",
          decision:
            "Shape the target architecture for customer implementations and record the reasoning behind key choices in Architecture Decision Records (ADRs).",
          outcome:
            "The ADRs paid off in particular with the support team, who could quickly understand the reasoning behind our choices.",
          details: [
            "Target architecture: owned the target architecture for some of the largest banking and insurance customers, mostly in the UK and Europe.",
            "Integration design: designed integration patterns for third-party providers, choosing between synchronous request/response, asynchronous and event-driven messaging, and batch exchanges, with resilience (retries, idempotency, error handling) built in.",
            "Risk management: run Failure Mode and Effects Analysis (FMEA) on designs and rollouts to surface likely failure points, rank them by impact and agree mitigations before they reach production.",
            "Voice of the Customer: routinely run VoC analysis to turn customer feedback and pain points into clear, prioritised requirements and solution direction.",
            "Customer partnership: act as a trusted technical advisor to customer stakeholders, aligning solutions with their strategic goals and positioning the platform where it adds the most value.",
            "Technical leadership: led teams of up to six people, guiding design direction and quality and translating customer needs into work that developers can execute.",
          ],
          clientRefs: ["some of the largest banking and insurance customers, mostly in the UK and Europe"],
        },
        {
          id: "principal-engineer",
          title: "Principal Engineer",
          org: "FintechOS, Bucharest, Romania",
          dates: { start: { year: 2024, month: 3 }, end: "present" },
          teamSize: 12,
          teamSizeUpTo: true,
          focus: "Platform upgrades and architecture",
          context:
            "Currently working for FintechOS's largest customer, while contributing to several company-wide initiatives beyond the customer engagement.",
          decision:
            "Designed an event-driven mechanism for applications where data points depend on many other data points: changes are published as events so dependent values update gracefully, without tightly coupling the components involved.",
          outcome: todo("the brief states no outcome for this role"),
          details: [
            "Platform upgrades: in charge of platform upgrades for all customers who decided on a major version bump, guiding teams of up to 12 people through planning and delivery.",
            "Design patterns: build solutions around standard design patterns, selecting the ones that fit each use case and solve the challenge at hand.",
            "People leadership: built strong relationships within the team, motivated people and kept them productive, and allocated them to the work that best fits their strengths.",
            "AI adoption: involved in the company's initiatives to adopt AI.",
            "Product improvement: contribute to improving product features, including the formula engine.",
            "Integrations: build connectors in the integration layer to link the platform with third-party services.",
            "International customers: experience working with American customers as well as UK and European ones.",
          ],
          clientRefs: ["FintechOS's largest customer", "American customers", "UK and European ones"],
        },
      ],
    },
  ],
  skills: [
    {
      name: "Architecture and strategy",
      items: ["Solution architecture", "Architecture Decision Records (ADRs)", "FMEA", "Voice of the Customer analysis", "platform upgrades", "AI adoption"],
    },
    {
      name: "Leadership",
      items: ["Leading teams of up to 12", "work allocation and motivation", "customer and stakeholder relationships"],
    },
    {
      name: "Platform and engineering",
      items: ["FintechOS Platform", "third-party integrations and connectors", "formula engine", "TypeScript", "SQL Server", "Azure"],
    },
    { name: "Also", items: ["ReactJS", "Redux", "GraphQL", "NodeJS", "neo4j", "HTML/CSS"] },
  ],
  languages: ["English", "German"],
  labels: {
    skip: "Skip to content",
    eyebrow: "Mission log",
    cv: "Download CV (PDF)",
    github: "GitHub",
    email: "Email",
    context: "Context",
    decision: "Decision",
    outcome: "Outcome",
    details: "Details",
    skills: "Skills and languages",
    languages: "Languages",
    contact: "Contact",
    telemetry: "Mission telemetry",
    tStage: "Stage",
    tRole: "Role",
    tYears: "Years",
    tTeam: "Team led",
    upTo: "up to",
    tFocus: "Focus",
    current: "Current",
    inView: "In view",
    notStated: "not stated",
    dash: "—",
    present: "Present",
  },
};
