# Mission format

`content/MISSION.md`. **One per vault.** It captures the *reason* the dev is learning any of
this, and every authoring decision — what to write next, which sources to reach for, which
questions to ask — traces back to it.

It is a Workshop note: it lives in the vault so Obsidian sees it, and the reader never does.

## Frontmatter

```yaml
---
id: <mint with `npm run ulid`>
title: Mission
---
```

`id` and `title`, because every note in this vault carries them, Library or not. No `topic`,
no `date`.

## Body

Free-form prose. What it has to answer:

- **The concrete goal.** Not "understand distributed systems" — the underlying outcome, the
  thing that changes when the skill lands. "A four-stage loop at companies that run two
  coding rounds and a system-design round" is a compass; "get better at algorithms" is not.
- **What is being optimised for, in order.** The ordering is what makes the ZPD decidable.
- **What is deliberately not being optimised for.** This is the half that protects the zone
  of proximal development — it is the licence to skip the exotic thing that looks impressive.

Keep it under a screen. Past that it has stopped being a compass and started being a plan.

## Changing it

**Only with the dev's explicit confirmation**, and write a Record capturing the shift when
you do. Missions genuinely move as understanding deepens, so a stale one steering future
sessions is the worst outcome — but a silently rewritten one is the second worst, because the
dev never sees the moment their own goal changed.

If the mission is empty or vague, **interview the dev before authoring anything**. A bad
mission is worse than no mission: it grounds every Lesson in the wrong place, and the Lessons
feel abstract without anyone being able to say why.
