# 13: Search, with the index deliberately unlike the page

**What to build:** Full-text search over all five Library types, so jumping around by memory of a
phrase works as well as jumping around by the tree — **without handing the dev the answers to the
questions they are searching**.

Quartz's search is **adopted whole in mechanism**; what changes is what lands in the index. The
component is **vendored in-tree** — this is where the fork/vendor line gets drawn: core Quartz
stays a remote, an altered community plugin is vendored, and fork-or-patch of core is not done.
`quartz-community/*` refs are pinned, since they are read at HEAD on un-versioned `0.1.x`.

The decisive fact: `contentIndex.json`'s `content` field is the **rendered tree flattened**
(`description` sets `file.data.text = toString(tree)`), so anything rendered is searchable —
including what the page visually conceals. Making the index differ from the page therefore means
**recomputing `file.data.text` in our own htmlPlugin ordered after `description`**, and **never
mutating the tree**, which would strip the content off the page too. Encode that ordering as
*greater than `description`'s order*, never as the literal number.

That plugin strips quiz material **per type**: mcq loses its options and explanations; a cloze span
is reduced to its **surface text**, so the sentence is findable without the hole being filled in;
recall loses its reveal.

Problems go the other way. A **sealed section stays in the index** — a solution is often the richest
prose on a topic and must be findable — and the spoiler is handled instead by **suppressing the
result excerpt for `problems/` results**. Sealing already survives injection into the preview pane
(12), so the result itself is safe.

Workshop is excluded **structurally**, by never rendering, not by a type-level exclusion rule.

**Blocked by:** 09, 11

**Status:** ready-for-agent

- [ ] Search covers all five Library types with no type-level exclusion list
- [ ] No Workshop note is ever a search result
- [ ] Results carry a type chip derived from the slug
- [ ] An mcq's options and explanations are absent from the index while the Lesson's prose is present
- [ ] A cloze sentence is findable by its surface text, and the hidden span's answer is not in the index
- [ ] A recall block's reveal is absent from the index
- [ ] A Problem's sealed `## Solution` text is findable by search
- [ ] A `problems/` result renders with no excerpt
- [ ] `topic` is copied to `tags` at build to feed search, and `tag-page` stays disabled
- [ ] The search component is vendored in-tree with its ref pinned; core Quartz is not patched
