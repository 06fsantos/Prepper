
**Build error**:
A vault constraint whose violation makes the vault invalid: the build reports it and refuses to publish. Reserved for the structural — a link that cannot resolve, a duplicate identity, a cycle in the prerequisite graph, a missing required field — never for matters of authoring taste.
_Avoid_: validation failure, lint error

**Build warning**:
A vault constraint whose violation is reported but does not make the vault invalid, because it describes legitimate work-in-progress rather than a mistake. An unwritten link is the canonical case: it marks intent. The distinction from a Build error is about authoring, not severity — a warning is a thing the author may have meant.
_Avoid_: lint warning, soft error
