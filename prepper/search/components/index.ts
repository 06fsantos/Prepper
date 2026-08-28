import { h } from "preact"
import * as fs from "node:fs"

import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../../quartz/components/types.ts"

/**
 * The search affordance: a button in the toolbar, and the overlay it opens.
 *
 * The markup is `@quartz-community/search` 0.1.0's `Search.tsx`, transcribed into `h`
 * because Quartz imports a local plugin as TypeScript at runtime and Node does not compile
 * JSX (`prepper/README.md`). Every class and every `data-` attribute here is one the
 * vendored client script reads, so this is a transcription and not a rewrite: change a
 * class name and the script stops finding the element.
 *
 * The strings are English rather than a call into an i18n table. Upstream's component
 * carries thirty-one locales; Quartz's own table would have been the better borrow, but
 * `quartz/i18n/index.ts` imports its locales without naming extensions, which puts it out
 * of reach of a plugin Node imports directly. Prepper is one dev's library and its
 * configured locale is `en-US`, so two strings inline is the whole of what is lost.
 */
const options = {
  /**
   * The preview pane stays **on**. It fetches a result's real HTML and injects its
   * elements, which is exactly why `prepper/problems` seals `## Solution` with a
   * `<details>` rather than with a script: the seal is markup, so it holds wherever the
   * markup lands. Turning the pane off for `problems/` was the fallback if that had not
   * worked out, and it is not needed.
   */
  enablePreview: true,
  /** Title, then content, then tags -- upstream's own weighting, and the right one here. */
  fieldPriority: ["title", "content", "tags"],
}

const vendor = (name: string): string =>
  fs.readFileSync(new URL(`../vendor/${name}`, import.meta.url), "utf8")

const script = vendor("search.inline.js")
const styles = vendor("search.css")

const PrepperSearch: QuartzComponentConstructor = () => {
  const Search: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const placeholder = "Search for something..."

    return h("div", { class: ["search", displayClass].filter(Boolean).join(" ") }, [
      h("button", { class: "search-button", "aria-label": "Search", "aria-expanded": "false" }, [
        h("svg", { role: "img", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 19.9 19.7" }, [
          h("title", {}, "Search"),
          h("g", { class: "search-path", fill: "none" }, [
            h("path", { "stroke-linecap": "square", d: "M18.5 18.3l-5.4-5.4" }),
            h("circle", { cx: "8", cy: "8", r: "7" }),
          ]),
        ]),
        h("p", {}, "Search"),
      ]),
      h("div", { class: "search-container" }, [
        h("div", { class: "search-space" }, [
          h("input", {
            autocomplete: "off",
            class: "search-bar",
            name: "search",
            type: "text",
            "aria-label": placeholder,
            placeholder,
          }),
          h("div", {
            class: "search-layout",
            "data-preview": String(options.enablePreview),
            "data-field-priority": JSON.stringify(options.fieldPriority),
          }),
        ]),
      ]),
    ])
  }

  Search.afterDOMLoaded = script
  Search.css = styles
  return Search
}

export { PrepperSearch }
