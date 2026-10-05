import type { Labels, Role } from "../model";
import { formatRange, present, teamSizeLabel } from "../model";

export function RoleCard(props: { role: Role; stageName: string; labels: Labels }) {
  const { role, labels } = props;
  const parts: [string, string][] = [];
  if (present(role.context)) parts.push([labels.context, role.context]);
  if (present(role.decision)) parts.push([labels.decision, role.decision]);
  if (present(role.outcome)) parts.push([labels.outcome, role.outcome]);
  const bullets = role.details.filter(present);
  return (
    <article
      className="card"
      id={role.id}
      data-stage={props.stageName}
      data-role={role.title}
      data-years={formatRange(role.dates, labels.present)}
      data-team={teamSizeLabel(role.teamSize) ?? ""}
      data-focus={present(role.focus) ? role.focus : ""}
    >
      <header className="card-header">
        <h3>{role.title}</h3>
        <p className="card-dates">{formatRange(role.dates, labels.present)}</p>
      </header>
      {present(role.org) ? <p className="card-org">{role.org}</p> : null}
      {parts.map(([label, text]) => (
        <div className="card-part" key={label}>
          <h4>{label}</h4>
          <p>{text}</p>
        </div>
      ))}
      {bullets.length > 0 ? (
        <details className="card-details">
          <summary>{labels.details}</summary>
          <ul>
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
