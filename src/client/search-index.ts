// Read-only text index of the page. Never writes to the DOM.

export interface Block {
  el: Element;
  nodes: Text[];
  segLengths: number[];
  text: string;
}

const SKIP =
  ".telemetry, nav, .topbar, [aria-hidden='true'], .visually-hidden, .skip-link, [data-search-ui], script, style";
const BLOCK =
  "p, li, h1, h2, h3, h4, h5, h6, summary, dt, dd, figcaption, blockquote, td, th, section, article, div, footer, main, details";

export function buildIndex(root: ParentNode = document): Block[] {
  const blocks: Block[] = [];
  const byEl = new Map<Element, Block>();
  for (const scope of Array.from(root.querySelectorAll("main, footer"))) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const node = n as Text;
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP)) continue;
      const data = node.data;
      if (data.length === 0) continue;
      const el = parent.closest(BLOCK) ?? parent;
      let block = byEl.get(el);
      if (!block) {
        block = { el, nodes: [], segLengths: [], text: "" };
        byEl.set(el, block);
        blocks.push(block);
      }
      block.nodes.push(node);
      block.segLengths.push(data.length);
      block.text += data;
    }
  }
  return blocks;
}
