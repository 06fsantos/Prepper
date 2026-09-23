# Provide the CV the scanner ranks against

Type: task
Status: resolved
Blocked by: —

## Question

The scanner ranks roles by fit against the owner's CV, and there is no CV/resume
anywhere in the repo today. Provide it so downstream matching decisions have real
signal to reason about.

This is a `task` (HITL): nothing to decide, but the CV-ingestion and matching
tickets are blocked until a real CV exists to look at.

## What resolving this looks like

- The owner supplies a CV (PDF or Markdown) at an agreed location (e.g.
  `.scratch/platform-architecture/cv/` while private, or wherever the chosen
  architecture files personal data).
- The answer records: the file location and format, and any facts later tickets
  depend on (target seniority, primary languages/stack, domains, must-haves,
  location/remote constraints).

## Context

- Independent of the architecture decision — unblocked now.
- Owner is prepping for senior C# SWE roles (see `content/MISSION.md`), but the CV
  is the ground-truth fit signal, not the Mission.

## Answer

**Done.** The owner supplied `Filipe_AssisSantos_CV.pdf`, copied into the repo at a
private location for downstream tickets to consume.

- **Location**: `.scratch/platform-architecture/cv/Filipe_AssisSantos_CV.pdf`
  (29KB PDF). Source was `~/Documents/JobSearch/Marshall Wace/`. Kept in `.scratch/`
  because the repo has no git remote — this is the "while private" location the ticket
  named, and where personal data lives until the chosen architecture files it elsewhere.
- **Format**: PDF. A one-time distillation into a structured profile is a separate,
  now-unblocked concern (the "CV ingestion → structured profile" fog item).

### Fit-signal facts later tickets depend on

- **Seniority**: Senior / Expert software engineer, 6+ years, all in financial
  services. Current title "Expert Software Engineer" (iPipeline, 07/2025–present).
  Target roles are senior/expert C# SWE.
- **Primary stack**: C# / .NET (both .NET Framework and .NET Core), MS SQL Server.
  Secondary languages listed: **Python and Java** — the profile is not C#-only, so
  matching must not hard-filter to a single language ([[dont-narrow-stack-field]]).
- **Architecture strengths** (the signal most relevant to this effort): event-driven
  & message-based architectures, data processing / batch pipelines, modular design
  (SOLID/DRY), DDD, anti-corruption patterns, monolith→modular refactoring,
  multi-threaded & async concurrency.
- **Data**: SQL Server tuning/profiling/optimisation & diagnostics (dotTrace, SQL
  Profiler, connection-pooling); MySQL.
- **Domains**: fintech — savings, pensions, protection, investment, insurance;
  compliance/accounting reporting; large-scale (millions of policies, £8bn+ assets).
- **Testing**: NUnit, TDD. **DevOps/Cloud**: CI/CD (Jenkins), Git, AWS (Cloud
  Practitioner cert). Also: AI-tooling SME (Copilot, Spec Kit), Scrum Master.
- **Education**: MSc Computing & Information Systems, Distinction (Queen Mary);
  BSc Pharmacology (UCL); ML thesis (CNN ECG classification, Python/Keras/Flask).
- **Location / constraints**: London, UK. No stated remote/relocation constraint on
  the CV; not a fit dimension yet — flag if a matching ticket needs it.
- **Languages (spoken)**: English & Portuguese native, Spanish advanced.

### Facts for the target-set / scanner design

- The source folder (`JobSearch/Marshall Wace/`) signals the owner's target set skews
  toward **quantitative/systematic finance & hedge funds** (Marshall Wace), consistent
  with the fintech + C#/.NET + low-latency/data-pipeline profile. This is a hint for
  the curated `companies.yaml`, not a constraint decided here.
