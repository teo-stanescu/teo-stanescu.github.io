import { Fragment } from "react";
import type { Labels, Role } from "../model";
import { formatRange, isRich, isTagged, present, presentDetail, teamSizeLabel } from "../model";

export function RoleCard(props: { role: Role; stageName: string; labels: Labels }) {
  const { role, labels } = props;
  const parts: [string, string][] = [];
  if (present(role.context)) parts.push([labels.context, role.context]);
  if (present(role.decision)) parts.push([labels.decision, role.decision]);
  if (present(role.outcome)) parts.push([labels.outcome, role.outcome]);
  const bullets = role.details.filter(presentDetail);
  const team = teamSizeLabel(role.teamSize, role.teamSizeUpTo ? labels.upTo : undefined);
  const meta: [string, string][] = [];
  if (team) meta.push([labels.tTeam, team]);
  if (present(role.focus)) meta.push([labels.tFocus, role.focus]);
  return (
    <article
      className="card"
      id={role.id}
      data-stage={props.stageName}
      data-role={role.title}
      data-years={formatRange(role.dates, labels.present)}
      data-team={team ?? ""}
      data-focus={present(role.focus) ? role.focus : ""}
    >
      <header className="card-header">
        <h3 id={`${role.id}-heading`}>{role.title}</h3>
        <p className="card-dates">{formatRange(role.dates, labels.present)}</p>
      </header>
      {present(role.org) ? <p className="card-org">{role.org}</p> : null}
      {meta.length > 0 ? (
        <dl className="card-meta">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {parts.map(([label, text]) => (
        <div className="card-part" key={label}>
          <h4>{label}</h4>
          <p>{text}</p>
        </div>
      ))}
      {bullets.length > 0 ? (
        <details className="card-details">
          <summary>
            {labels.details}
            <span className="visually-hidden">
              {" "}
              {labels.dash} {role.title}
            </span>
          </summary>
          <ul>
            {bullets.map((b, i) => (
              <li key={i}>
                {isRich(b)
                  ? b.runs.map((r, j) =>
                      isTagged(r) ? (
                        <span key={j} lang={r.lang}>{r.text}</span>
                      ) : (
                        <Fragment key={j}>{r}</Fragment>
                      ),
                    )
                  : b}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
