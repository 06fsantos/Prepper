# Prepper Resources

The curated set of trusted sources the authoring skills draw on. **Author-side only:** this
file lives at the repo root, outside `content/`, because no source ever becomes a note.
Citations are written into notes as inline external links; this file is where the sources
themselves are kept and judged.

## Knowledge

- [Book: _Introduction to Algorithms_ (CLRS), 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
  The reference for correctness and complexity arguments. Use for: anything where a
  hand-wave about a bound needs to become a proof.
- [Book: _Designing Data-Intensive Applications_ by Martin Kleppmann](https://dataintensive.net/)
  Use for: system-design vocabulary — replication, partitioning, consistency, the actual
  tradeoffs rather than the diagram.
- [.NET API reference](https://learn.microsoft.com/en-us/dotnet/api/)
  Primary source for what a BCL collection actually guarantees. Use for: complexity and
  ordering claims about C# types, which is the interview language for this vault.
- [The NeetCode problem list](https://neetcode.io/practice)
  The problem canon. Use for: what to import, and as the on-list gate the `import` skill
  checks against — widening past it invalidates the acquisition method.

## Wisdom (Communities)

- [r/cscareerquestions interview experiences](https://reddit.com/r/cscareerquestions)
  Low signal-to-noise, occasionally the only place a company's actual loop is described.
  Use for: calibrating what a given company asks, never for technique.
- [Hacker News threads on hiring](https://news.ycombinator.com/)
  Use for: dissent — the arguments against the format, which are worth having heard before
  being asked to perform in it.

## Gaps

- **Behavioural interviewing.** No source here is trusted on it. Behavioural Problems are
  hand-authored against the template in `PROBLEM-FORMAT.md` partly for this reason.
- **System-design rubrics.** Plenty of material on the systems; almost none on what a
  forty-five-minute answer is graded against.
