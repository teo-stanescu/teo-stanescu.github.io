// Decorative air traffic control map data. Not CV content and not read by the search.
// The map is aria-hidden. Only LROP and EDDW are real places. Every other code is invented.
export type Point = { code: string; x: number; y: number };

export const VIEW = { w: 1600, h: 1000 };

// Two radar centres: the real airports.
export const AIRPORTS: readonly Point[] = [
  { code: "EDDW", x: 1120, y: 360 },
  { code: "LROP", x: 280, y: 760 },
];

export const RINGS: readonly { x: number; y: number; r: readonly number[] }[] = [
  { x: 1120, y: 360, r: [120, 240, 360, 480, 600] },
  { x: 280, y: 760, r: [90, 180, 300] },
];

export const RADIALS =
  "M1235 391L1699 515M1204 444L1544 784M1151 475L1275 939M1088 475L964 939M1035 444L695 784M1004 391L540 515M1004 328L540 204M1035 275L695 -64M1088 244L964 -219M1151 244L1275 -219M1204 275L1544 -64M1235 328L1699 204" +
  "M370 760L580 760M343 823L492 972M280 850L280 1060M216 823L67 972M190 760L-20 760M216 696L67 547M280 670L279 460M343 696L492 547";

// Runway strokes: two parallel, one crossing, at each airport.
export const RUNWAYS =
  "M1070 330L1170 390M1062 345L1162 405M1100 300L1140 420" + "M200 790L360 730M208 806L368 746M250 700L310 820";

// Route legs between invented waypoints.
export const ROUTES =
  "M60 220L330 260L610 190L880 250L1120 360M280 760L520 650L760 700L960 600L1120 360M1120 360L1360 560L1540 520";

export const WAYPOINTS: readonly Point[] = [
  { code: "VELOM", x: 330, y: 260 },
  { code: "TIRAX", x: 610, y: 190 },
  { code: "DUKON", x: 880, y: 250 },
  { code: "SOBAR", x: 520, y: 650 },
  { code: "NERIT", x: 760, y: 700 },
  { code: "KALUV", x: 960, y: 600 },
  { code: "ORMIX", x: 1360, y: 560 },
  { code: "BRAVU", x: 1540, y: 520 },
  { code: "LUXET", x: 1450, y: 150 },
  { code: "PADEN", x: 140, y: 480 },
];
