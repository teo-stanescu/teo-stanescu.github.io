import type { Labels, Stage as StageData } from "../model";
import { RoleCard } from "./RoleCard";

export function Stage(props: { stage: StageData; labels: Labels }) {
  const { stage, labels } = props;
  return (
    <section className="stage" id={`stage-${stage.id}`}>
      <h2>{stage.heading}</h2>
      <p className="stage-label">{stage.label}</p>
      {stage.roles.map((r) => (
        <RoleCard key={r.id} role={r} stageName={stage.telemetryName} labels={labels} />
      ))}
    </section>
  );
}
