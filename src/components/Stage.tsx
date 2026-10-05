import type { Labels, Stage as StageData } from "../model";
import { RoleCard } from "./RoleCard";
import { PlaneIcon } from "./PlaneIcon";

export function Stage(props: { stage: StageData; labels: Labels }) {
  const { stage, labels } = props;
  return (
    <section className="stage" id={`stage-${stage.id}`}>
      <PlaneIcon size={16} className="stage-plane" />
      <p className="stage-label">{stage.label}</p>
      <h2>{stage.heading}</h2>
      {stage.roles.map((r) => (
        <RoleCard key={r.id} role={r} stageName={stage.telemetryName} labels={labels} />
      ))}
    </section>
  );
}
