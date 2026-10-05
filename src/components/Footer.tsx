import type { Content } from "../model";
import { GITHUB_URL } from "../config";

export function Footer(props: { content: Content }) {
  const { person, labels } = props.content;
  const github = new URL(GITHUB_URL);
  return (
    <footer className="contact" id="contact">
      <h2>{labels.contact}</h2>
      <p>
        <a href={GITHUB_URL}>{`${github.host}${github.pathname}`}</a>
      </p>
      <p>
        <a href={`mailto:${person.email}`}>{person.email}</a>
      </p>
    </footer>
  );
}
