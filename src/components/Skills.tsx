import type { Content } from "../model";
import { present } from "../model";

export function Skills(props: { content: Content }) {
  const { skills, languages, labels } = props.content;
  const groups = skills
    .map((g) => ({ name: g.name, items: g.items.filter(present) }))
    .filter((g) => g.items.length > 0);
  return (
    <section className="skills" id="skills">
      <h2>{labels.skills}</h2>
      {groups.map((g) => (
        <div className="skill-group" key={g.name}>
          <h3>{g.name}</h3>
          <ul>
            {g.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="skill-group skill-languages">
        <h3>{labels.languages}</h3>
        <ul>
          {languages.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
