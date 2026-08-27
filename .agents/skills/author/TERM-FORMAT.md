# Term format

`content/terms/<dash-case-name>.md`. A Term is **what a topic is** — and, more importantly,
it is the only thing a `topic` value may name. It supersedes upstream `teach`'s glossary: a
glossary was one file of definitions, and this is one note per definition, because each one
has to be a link target and a page of its own.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: Hash maps
topic:
  - big-o-notation
---
```

| field   | required | shape                                                                    |
| ------- | -------- | ------------------------------------------------------------------------ |
| `id`    | yes      | ULID, immutable, minted by running the command                           |
| `title` | yes      | The term as a reader would say it.                                       |
| `topic` | no       | List. A Term may sit under a broader Term — `hash-maps` under `big-o-notation`. |

The filename is the vocabulary token. `topic: [hash-maps]` on a Lesson resolves against
`content/terms/hash-maps.md`, case-insensitively. This is why the plain name is reserved for
the Term and the cheat sheet is decorated `<term>-cheat-sheet.md`: filenames are unique
vault-wide, and the two would otherwise collide on the most predictable name in the vault.

## Body

**A sentence or two.** The Term page's real content is the index the graph generates —
every Library note whose `topic` names this Term, grouped by type with the cheat sheet
pinned first. The prose is the hub label, not the material.

- A Term answers *"what is here on this?"*. The **cheat sheet** answers *"remind me how this
  works"*. Do not write the second into the first.
- The carve-out is an **area Term** — `System design`, `Behavioural` — which may carry a real
  overview in its body, because an area with no Lessons of its own has nowhere else to
  explain itself.
- **An empty body is silent and legitimate.** This skill mints Terms ahead of anyone having
  anything to say about them; the Vault report lists an empty Term as backlog in the
  authoring queue, which is what it is. Never fabricate a definition to fill the space.

## Minting

Minting a Term is **mandatory, not optional**, whenever a note this skill writes claims a
topic that has no Term. `topic` is a controlled vocabulary and the build errors on an unknown
value, so there is no way to invent a topic except by writing the Term — which is exactly the
point. Tag drift becomes impossible by construction rather than by discipline.

A stub is enough: `id`, `title`, one paragraph. Mint the ULID in the same
`npm run ulid <n>` call as the rest of the run.
