import type { Content } from "../model";
import { present } from "../model";
import { GITHUB_URL } from "../config";

export function Hero(props: { content: Content; hasCv: boolean; base: string }) {
  const { person, labels } = props.content;
  const line = person.positioning;
  return (
    <header className="hero">
      <a className="skip-link" href="#main">
        {labels.skip}
      </a>
      <p className="eyebrow">{labels.eyebrow}</p>
      <h1>{person.name}</h1>
      <p className="hero-title">{person.title}</p>
      <p className="hero-location">{person.location}</p>
      {present(line) ? <p className="hero-line">{line}</p> : null}
      <div className="hero-actions">
        {props.hasCv ? (
          <a className="btn btn-primary" href={`${props.base}cv.pdf`}>
            {labels.cv}
          </a>
        ) : null}
        <a className="btn btn-secondary" href={GITHUB_URL}>
          {labels.github}
        </a>
        <a className="btn btn-secondary" href={`mailto:${person.email}`}>
          {labels.email}
        </a>
      </div>
    </header>
  );
}
