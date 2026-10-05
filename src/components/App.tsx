import type { Content } from "../model";
import { Hero } from "./Hero";

export type PageProps = { content: Content; hasCv: boolean; base: string };

// Tasks 8 and 9 fill <main>.
export function App(props: PageProps) {
  return (
    <>
      <Hero content={props.content} hasCv={props.hasCv} base={props.base} />
      <main id="main"></main>
    </>
  );
}
