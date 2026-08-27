/**
 * The app's entry point: opening Prepper lands on the **topic index**.
 *
 * There is a decision here worth stating plainly, because the obvious alternative is what
 * most study tools do: the home page **does not pretend to know what is due**. No queue, no
 * streak, no "3 cards waiting" -- the app opens on what there is to study, in the shape the
 * dev thinks about it in (topics, not directories), and choosing is left to the person who
 * knows what interview is next week. Scheduling is a later ticket's question and a
 * different screen's.
 *
 * ## Why a page type rather than an emitter
 *
 * Quartz's **pageType** seam is the one that generates a page nobody wrote: `generate`
 * returns virtual pages, and the dispatcher renders each through the ordinary layout --
 * same head, same sidebar, same footer as every other page. Writing `index.html` from an
 * emitter instead would mean re-implementing that layout, and the copy would drift from the
 * real one on the first upstream merge.
 *
 * `match` never matches, on purpose: this page type owns exactly one page, and that page is
 * generated rather than written, so there is no file for it to claim. It is not a matcher
 * that forgot a case.
 *
 * ## Why it yields to a written `index.md`
 *
 * If the vault ever holds its own `content/index.md`, that note wins and nothing is
 * generated. A generated page and a written one at the same slug would be two pages racing
 * for one file, and the vault should always be able to say something the build cannot
 * overrule.
 *
 * ## Why it renders the same tree as the sidebar
 *
 * `TopicTree` is imported from `prepper/topics` rather than reproduced. One index, and the
 * entry page is a third view of it -- if it built its own markup, the day the grouping rule
 * changed would be the day the home page and the sidebar started disagreeing about what is
 * filed where.
 */
import { h } from "preact"

import type { FullSlug } from "../../quartz/util/path.ts"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../quartz/components/types.ts"
import type { QuartzPageTypePluginInstance, VirtualPage } from "../../quartz/plugins/types.ts"
import type { ProcessedContent } from "../../quartz/plugins/vfile.ts"

import { graphOf } from "../graph/graph.ts"
import { topicIndex } from "../topics/topic-index.ts"
import { TopicTree } from "../topics/components/index.ts"

export const manifest = {
  name: "prepper-home",
  displayName: "Prepper home",
  description: "Generates the app's entry point: the topic index, at the site root.",
  version: "1.0.0",
  category: "pageType",
}

/** The slug the app opens on. */
const homeSlug = "index" as FullSlug

/**
 * The entry page's body: every topic, and everything filed under each.
 *
 * It is the whole index rather than a summary of it. A dev opening the app is choosing
 * what to study, and a list of topic names with the notes hidden one click away would make
 * them click into a topic to find out whether it holds anything worth an evening.
 */
const HomeBody: QuartzComponentConstructor = () => {
  const Home: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = fileData.slug ?? homeSlug
    return h("div", { class: "prepper-home popover-hint" }, [
      TopicTree(topicIndex(graphOf(allFiles)), slug),
    ])
  }

  Home.css = styles
  return Home
}

const PrepperHome = (): QuartzPageTypePluginInstance => ({
  name: "PrepperHome",
  // No written note is this page. See the header: the one page this type owns is generated.
  match: () => false,
  generate({ content }: { content: ProcessedContent[] }): VirtualPage[] {
    const written = content.some(([, file]) => file.data.slug === homeSlug)
    if (written) return []
    return [{ slug: homeSlug, title: "Topics", data: {} }]
  },
  // The ordinary content layout, so the entry point carries the same chrome -- the sidebar
  // included -- as everything the reader reaches from it.
  layout: "content",
  body: HomeBody,
})

/** Room to breathe around a page that is nothing but navigation. */
const styles = `
.prepper-home {
  margin-top: 1rem;
}
`

export default PrepperHome
