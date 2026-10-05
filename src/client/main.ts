// Client entry. Adds scroll and focus behaviour to the prerendered page.
import { startTrajectory } from "./trajectory";
import { startTelemetry } from "./telemetry";

try {
  startTrajectory();
  startTelemetry();
  const root = document.documentElement;
  root.classList.add("js");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("motion");
  }
} catch {
  // The prerendered page stays complete.
}
