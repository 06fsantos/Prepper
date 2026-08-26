# 04: Wikilinks resolve, and unwritten links become an affordance

**What to build:** The same link works in Obsidian and in the app. A wikilink resolves against
the **filename stem, case-insensitively**, extension optional — never against `title`, and with
no shortest-unique-path matching, since filenames are unique vault-wide. Aliases use Obsidian's
pipe so a link's text can be fitted to its sentence without the vault rendering differently in
the two places the dev reads it.

An **unwritten link** — one whose target does not exist — is legitimate authoring practice: it
marks intent, and the reading surface doubles as a todo list. So it never breaks the build. It
renders as a marked, unclickable affordance, warns, and is carried as a **placeholder node** so
that unwritten notes can later be ranked by how much existing writing leans on them (14).
Placeholder nodes never enter the Library index and never enter search.

Note that a missing `prerequisites` or `topic` target is **not** an unwritten link — those are
errors, and they belong to 06.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `[[note]]` resolves by filename stem, case-insensitively, with or without the extension
- [ ] `[[note|display text]]` renders the alias as the link text
- [ ] `[[note#Heading]]` links to that heading on the target page
- [ ] `![[image.png]]` renders the attachment, as it does in Obsidian
- [ ] A wikilink to a nonexistent note renders marked and unclickable, and the build still succeeds
- [ ] That link produces a warning, not an error
- [ ] The unwritten target exists in the graph as a placeholder node, and appears in neither the Library index nor search
