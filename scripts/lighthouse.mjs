import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const RUNS = 3;
const THRESHOLD = 95;
const PORT = 4173;

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Median of each category over the runs, as an integer 0..100. */
export function medianScores(runs) {
  const out = {};
  for (const c of CATEGORIES) {
    out[c] = Math.round(median(runs.map((r) => r.categories[c].score * 100)));
  }
  return out;
}

/** Names of the categories whose score is below the threshold. */
export function failing(scores, threshold) {
  return CATEGORIES.filter((c) => scores[c] < threshold);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "localhost" });
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });
}

async function waitForPort(port, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server did not open port ${port}`);
}

async function main() {
  const build = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);

  const { chromium } = await import("@playwright/test");
  const env = { ...process.env, CHROME_PATH: chromium.executablePath() };

  mkdirSync(".lighthouse", { recursive: true });
  const preview = spawn("npm", ["run", "preview"], { stdio: "ignore" });
  const stop = () => preview.kill();
  process.on("exit", stop);
  try {
    await waitForPort(PORT);
    const reports = [];
    for (let n = 1; n <= RUNS; n++) {
      const path = `.lighthouse/run-${n}.json`;
      const r = spawnSync(
        "npx",
        [
          "--yes",
          "lighthouse@12.8.2",
          `http://localhost:${PORT}/`,
          "--output=json",
          `--output-path=${path}`,
          "--quiet",
          "--chrome-flags=--headless=new",
          `--only-categories=${CATEGORIES.join(",")}`,
        ],
        { stdio: "inherit", env },
      );
      if (r.status !== 0) throw new Error(`lighthouse run ${n} failed`);
      reports.push(JSON.parse(readFileSync(path, "utf8")));
    }
    const scores = medianScores(reports);
    console.log("\nMedian of 3 runs (mobile emulation)");
    for (const c of CATEGORIES) console.log(`${c.padEnd(15)} ${scores[c]}`);
    const bad = failing(scores, THRESHOLD);
    if (bad.length) {
      console.error(`FAIL: below ${THRESHOLD}: ${bad.join(", ")}`);
      process.exitCode = 1;
    }
  } finally {
    stop();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
