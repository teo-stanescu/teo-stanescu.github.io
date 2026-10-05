import { renderToStaticMarkup } from "react-dom/server";
import { content as defaultContent } from "./content";
import type { Content } from "./model";
import { App, type PageProps } from "./components/App";
import { Head } from "./components/Head";

export function render(opts: Omit<PageProps, "content"> & { content?: Content }): {
  head: string;
  html: string;
} {
  const content = opts.content ?? defaultContent;
  return {
    head: renderToStaticMarkup(<Head content={content} />),
    html: renderToStaticMarkup(<App content={content} hasCv={opts.hasCv} base={opts.base} />),
  };
}
