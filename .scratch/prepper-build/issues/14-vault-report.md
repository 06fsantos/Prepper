# 14: The Vault report at `/report`

**What to build:** The build's other channel. **Validation shouts and the report whispers**, and the
two never share a line: a fact worth failing a build over is a rule, a fact that is not is a report,
and there is nothing in between and no promotion path between them. Nothing is wrong when the
report prints.

A page at `/report`, emitted by **every** build, plus **one terminal line per build** pointing at
it. Published **unlisted** rather than `--serve`-only, so the build has one mode rather than two
that diverge. Two sections:

**Authoring queue** — *what should I write next*, answered by the vault rather than by memory.
Unwritten notes ranked by how much existing writing leans on them, sorted **typed-then-total with
the breakdown printed** and **no weighting constant**, so a committed `practices` obligation
outranks a passing mention without a magic number deciding by how much. The breakdown is
**navigation, not decoration**: an unwritten note has no page of its own, so each row links to its
inbound sources. Terms minted with an empty body are listed here too — a note waiting to be written
is backlog, not a defect. A `draft: true` note's body links are excluded, so the queue fills with
committed intent rather than speculation. The long tail is folded, never capped.

**Vault hygiene** — *what rotted*: unreferenced attachments; Library notes with no inbound links;
Terms with **no inbound `topic` edge** (narrowed from "nothing points at", whose wide reading fires
constantly on correct authoring).

**Load-bearing implementation constraint:** the report must be emitted **as a page** and must
**never** be generated as a virtual `content/` file fed through the transform pipeline. Were its
links to become graph edges, the report would link to every orphan it lists, each would gain an
inbound link, and the hygiene section would **erase itself on the second build** — a failure that
is silent. Being emitter output is also what keeps it out of `description` and `crawl-links`
structurally, the same category as `contentIndex.json` and the 404 page, so the Library-only
rendering rule is untouched. 02 is where this was proven.

Nothing on this channel is ever validated.

**Blocked by:** 05, 02

**Status:** ready-for-agent

- [ ] Every build emits `/report`, and prints exactly one terminal line pointing at it
- [ ] The report is published unlisted, in both `build` and `build --serve`
- [ ] The authoring queue ranks unwritten notes typed-then-total, printing the breakdown, with no weighting constant
- [ ] Each queue row links to the notes that link to it
- [ ] Terms with an empty body appear in the queue
- [ ] A `draft: true` note's body links do not contribute to queue ranking
- [ ] Hygiene lists unreferenced attachments, Library notes with no inbound links, and Terms with no inbound `topic` edge
- [ ] Building twice in a row leaves the hygiene section unchanged
- [ ] `/report` contributes no edges to the link graph and does not appear in `contentIndex.json`
