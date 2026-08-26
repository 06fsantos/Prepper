# Prototype: quiz fence candidates (ticket 03)

Rough artifact to react to. Three candidate bodies for the same three questions, so
the comparison is like-for-like. Read them as they'd appear in Obsidian: a code block,
monospace, no rendering.

---

## Candidate A — YAML

```quiz
id: 01JQ9F3K2M7VXN4P
type: mcq
prompt: A hash map lookup, average case, costs what?
options:
  - text: Constant time, no scan
    correct: true
    why: The key hashes straight to its bucket.
  - text: Constant time, one scan
    why: Nothing is scanned unless buckets collide.
  - text: Linear time, full scan
    why: That is an unsorted array, not a hash map.
```

```quiz
id: 01JQ9F3K2M7VXN4Q
type: cloze
text: Binary search needs a {{sorted}} input and runs in {{O(log n)}} time.
```

```quiz
id: 01JQ9F3K2M7VXN4R
type: recall
prompt: Why does a dynamic array's push amortise to O(1)?
answer: Doubling makes copies exponentially rare, so total copy work stays linear.
```

---

## Candidate B — line-prefix

Sigils: `?` prompt, `=` correct option, `-` wrong option, `>` explanation,
`~` answer (recall), `{{...}}` cloze. One blank line separates nothing; each block is one question.

```quiz 01JQ9F3K2M7VXN4S
? A hash map lookup, average case, costs what?
= Constant time, no scan
> The key hashes straight to its bucket.
- Constant time, one scan
> Nothing is scanned unless buckets collide.
- Linear time, full scan
> That is an unsorted array, not a hash map.
```

```quiz 01JQ9F3K2M7VXN4T
~ Binary search needs a {{sorted}} input and runs in {{O(log n)}} time.
```

```quiz 01JQ9F3K2M7VXN4U
? Why does a dynamic array's push amortise to O(1)?
~ Doubling makes copies exponentially rare, so total copy work stays linear.
```

---

## Candidate C — Markdown-inside-the-fence

The fence body is ordinary Markdown: a heading is the prompt, a GFM task list is the
options, a blockquote is the explanation. Nothing new to learn; nothing new to read.

```quiz 01JQ9F3K2M7VXN4V
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
- [ ] Constant time, one scan
- [ ] Linear time, full scan

> The key hashes straight to its bucket. Collisions are the exception, not the path.
```

```quiz 01JQ9F3K2M7VXN4W cloze
Binary search needs a {{sorted}} input and runs in {{O(log n)}} time.
```

```quiz 01JQ9F3K2M7VXN4X recall
Why does a dynamic array's push amortise to O(1)?

> Doubling makes copies exponentially rare, so total copy work stays linear.
```

---

## What each one costs

| | A — YAML | B — line-prefix | C — Markdown |
|---|---|---|---|
| Obsidian readability | worst: keys outnumber content | good, once sigils are learned | best: reads as prose |
| Parser | off-the-shelf YAML | ~40 lines, bespoke | Markdown AST, already in the build |
| Agent emits it | trivially, but verbose | needs the sigil table in its prompt | trivially — it is just Markdown |
| Equal-length MCQ options | hard to eyeball inside `text:` | options line up in a column | options line up in a column |
| Extends to new types | free (new keys) | new sigils, fast to exhaust | headings/lists run out fast |
| Escaping code in a prompt | quoting hell for `:` and `#` | fine | fine, but nested fences need `~~~~` |

## Open, whatever the syntax

1. **Where the id comes from.** Hand-written ULID by the agent (shown above), lesson-id + ordinal
   (reordering rewrites history), or a content hash (a typo fix orphans the review record).
2. **Which types exist at launch** — mcq, cloze, recall, code-completion, or a subset.
3. **Whether a wrong answer links back into the lesson**, and if so whether that is a heading
   anchor written per option or derived from position.
