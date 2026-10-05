import type { Content } from "../model";
import { GITHUB_URL } from "../config";

export function Footer(props: { content: Content }) {
  const { person, labels } = props.content;
  return (
    <footer className="contact" id="contact">
      <h2>{labels.contact}</h2>
      <p>
        <a href={GITHUB_URL}>{GITHUB_URL.replace("https://", "")}</a>
      </p>
      <p>
        <a href={`mailto:${person.email}`}>{person.email}</a>
      </p>
    </footer>
  );
}
