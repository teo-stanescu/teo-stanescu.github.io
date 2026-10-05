// Client entry. Adds scroll and focus behaviour to the prerendered page.
// An inline script in the head sets the "js" class before first paint. This file keeps it.
import { startScroll } from "./scroll";
import { startTrajectory } from "./trajectory";
import { startTelemetry } from "./telemetry";

const root = document.documentElement;
try {
  startScroll();
  startTrajectory();
  startTelemetry();
  root.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => root.classList.toggle("motion", !reduce.matches);
  apply();
  reduce.addEventListener("change", apply);
} catch {
  // A start-up error leaves the static prerendered page, which is complete.
  root.classList.remove("js", "motion");
}
