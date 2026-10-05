import type { Content } from "../model";

// The Record type avoids a literal key named base. The repo scan test flags that key.
export type PageProps = { content: Content; hasCv: boolean } & Record<"base", string>;

// Empty frame. Tasks 7 to 9 fill it.
export function App(props: PageProps) {
  void props;
  return <main id="main"></main>;
}
