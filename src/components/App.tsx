import type { Content } from "../model";
import { Hero } from "./Hero";
import { Telemetry } from "./Telemetry";
import { Skills } from "./Skills";
import { Footer } from "./Footer";
import { Stage } from "./Stage";
import { Trajectory } from "./Trajectory";

export type PageProps = { content: Content; hasCv: boolean; base: string };

export function App(props: PageProps) {
  return (
    <>
      <Hero content={props.content} hasCv={props.hasCv} base={props.base} />
      <Telemetry content={props.content} />
      <main id="main">
        <Trajectory />
        {props.content.stages.map((s) => (
          <Stage key={s.id} stage={s} labels={props.content.labels} />
        ))}
        <Skills content={props.content} />
      </main>
      <Footer content={props.content} />
    </>
  );
}
