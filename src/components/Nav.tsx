import type { Content } from "../model";
import { orderedStages } from "../model";

// The one nav list. The rail and the Contents popover use this same element.
export function Nav(props: { content: Content }) {
  const { labels } = props.content;
  return (
    <nav id="nav" className="nav" aria-label={labels.contents}>
      <ul>
        <li>
          <a href="#top">{labels.navTop}</a>
        </li>
        {orderedStages(props.content).map((s) => (
          <li key={s.id}>
            <a href={`#stage-${s.id}`}>{s.heading}</a>
            <ul>
              {s.roles.map((r) => (
                <li key={r.id}>
                  <a href={`#${r.id}-heading`}>{r.title}</a>
                </li>
              ))}
            </ul>
          </li>
        ))}
        <li>
          <a href="#skills">{labels.navSkills}</a>
        </li>
        <li>
          <a href="#contact">{labels.contact}</a>
        </li>
      </ul>
    </nav>
  );
}
