import { orderedStages, type Content } from "../model";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Telemetry } from "./Telemetry";
import { Skills } from "./Skills";
import { Footer } from "./Footer";
import { Stage } from "./Stage";
import { Trajectory } from "./Trajectory";

export type PageProps = { content: Content; hasCv: boolean; base: string };

export function App(props: PageProps) {
  const { labels } = props.content;
  return (
    <>
      <a className="skip-link" href="#main">
        {labels.skip}
      </a>
      <div
        id="topbar"
        className="topbar"
        data-search={labels.search}
        data-contents={labels.contents}
        data-placeholder={labels.placeholder}
        data-placeholder-touch={labels.placeholderTouch}
        data-no-matches={labels.noMatches}
        data-of={labels.of}
        data-next={labels.next}
        data-previous={labels.previous}
        data-results={labels.results}
      />
      <Nav content={props.content} />
      <Hero content={props.content} hasCv={props.hasCv} base={props.base} />
      <Telemetry content={props.content} />
      <main id="main" tabIndex={-1}>
        <Trajectory />
        {orderedStages(props.content).map((s) => (
          <Stage key={s.id} stage={s} labels={props.content.labels} />
        ))}
        <Skills content={props.content} />
      </main>
      <Footer content={props.content} />
    </>
  );
}
