import type { Content } from "../model";
import { Hero } from "./Hero";
import { Stage } from "./Stage";
import { Trajectory } from "./Trajectory";

export type PageProps = { content: Content; hasCv: boolean; base: string };

// Task 9 adds skills and contact to <main>.
export function App(props: PageProps) {
  return (
    <>
      <Hero content={props.content} hasCv={props.hasCv} base={props.base} />
      <main id="main">
        <Trajectory />
        {props.content.stages.map((s) => (
          <Stage key={s.id} stage={s} labels={props.content.labels} />
        ))}
      </main>
    </>
  );
}
