import type { Content } from "../model";
import { currentRole, formatRange, present, teamSizeLabel } from "../model";

function Value(props: { text: string | null; notStated: string }) {
  if (props.text) return <>{props.text}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{props.notStated}</span>
    </>
  );
}

export function Telemetry(props: { content: Content }) {
  const { labels } = props.content;
  const { stage, role } = currentRole(props.content);
  const rows: [string, string, string | null][] = [
    ["stage", labels.tStage, stage.telemetryName],
    ["role", labels.tRole, role.title],
    ["years", labels.tYears, formatRange(role.dates, labels.present)],
    ["team", labels.tTeam, teamSizeLabel(role.teamSize)],
    ["focus", labels.tFocus, present(role.focus) ? role.focus : null],
  ];
  return (
    <aside
      className="telemetry"
      aria-label={labels.telemetry}
      data-idle={labels.current}
      data-active={labels.inView}
      data-dash={labels.notStated}
    >
      <p className="telemetry-state" data-t="state">
        {labels.current}
      </p>
      <dl>
        {rows.map(([key, label, value]) => (
          <div className="telemetry-row" key={key}>
            <dt>{label}</dt>
            <dd data-t={key}>
              <Value text={value} notStated={labels.notStated} />
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
