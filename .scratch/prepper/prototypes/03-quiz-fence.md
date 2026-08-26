# Quiz fence — settled form (ticket 03)

The candidate comparison that produced this lives in `03-quiz-fence-candidates.md`;
the render mockup in `03-quiz-render.html`.

## Infostring

    ```quiz <ULID> [type]

`type` is `cloze` or `recall`. Omitted means `mcq`.

## Multiple choice

```quiz 01JQ9F3K2M7VXN4V
A hash map lookup, average case, costs what?

- [x] Constant time, no scan
  > The key hashes straight to its bucket.
- [ ] Constant time, one scan
  > Nothing is scanned unless buckets collide.
  > See [[Collision handling]]
- [ ] Linear time, full scan
  > That is an unsorted array, not a hash map.
```

Exactly one `[x]`. Every option the same word count, and character count where it can be
managed. Feedback is immediate on click; the clicked option and the correct one both reveal
their blockquote.

## Cloze

```quiz 01JQ9F3K2M7VXN4T cloze
Binary search needs a {{sorted}} input and runs in {{O(log n)}} time.
```

All spans reveal together on click. One grade for the block.

## Free recall

```quiz 01JQ9F3K2M7VXN4U recall
Why does a dynamic array's push amortise to O(1)?

> Doubling makes copies exponentially rare, so total copy work stays linear.
```

Reveal, then self-grade. The grade scale belongs to the scheduler (ticket 05).

## Rules

- The fence body is **ordinary Markdown**, parsed with the same parser as the note body.
  Wikilinks inside it are real wikilinks and produce real graph edges.
- A body containing its own fence uses a `~~~~quiz` outer fence.
- Quiz blocks appear in **lessons only**.
