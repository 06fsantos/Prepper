# Context Map

Prepper is an umbrella platform of sealed bounded contexts
([ADR 0006](docs/adr/0006-a-modular-platform-with-a-sealed-library-and-a-dotnet-scanner.md)).
Today one context exists (the Library) and one is forthcoming (the Scanner).

## Contexts

- [Learning Content](./CONTEXT.md) — the **Library**: the Quartz clone that renders the
  Obsidian vault into a linked, navigable site with in-place practice. Its domain model
  is the vault itself. Written in TypeScript against Quartz; kept exactly as-is.
- [The Scanner](./scanner/CONTEXT.md) (`scanner/`, C#/.NET) — reads a curated company list,
  pulls open roles, and ranks them against the owner's CV. Decomposes into three internal
  contexts (its own `CONTEXT.md` holds the ubiquitous language):
  - **Job Scanning** — fetches and normalizes roles; an anti-corruption layer at the
    careers-page edge translates external HTML/ATS payloads into a clean internal `Role`.
  - **Candidate Profile** — the CV distilled once into a structured profile.
  - **Matching / Fit Scoring** — ranks roles against the profile.
- **Deferred, named so the architecture does not foreclose them**: Application Tracking
  (future) and Identity / Accounts (multi-tenant only).

## Relationships

- **Learning Content ↔ everything else**: **Separate Ways**. They share no domain model,
  no storage, and no code. The Library never reaches into the scanner and the scanner
  never reaches into the vault.
- **Job Scanning → external careers pages**: an **anti-corruption layer** protects the
  `Role` model from heterogeneous upstream HTML and ATS formats.
- **Job Scanning → Matching** and **Candidate Profile → Matching**: Matching is the
  downstream customer of both; it consumes normalized roles and the structured profile
  and produces ranked matches.
