namespace Scanner.Matching;

/// <summary>
/// One scored <c>(CandidateProfile, Role, ScrapeRun)</c> triple. References the other
/// contexts <b>by id only</b> — no navigation into their object graphs — which is what keeps
/// the seal real. Shaped to record any matching-ladder stage's output without a migration.
/// </summary>
public class Match
{
    public long Id { get; set; }

    // Cross-context references, by id only.
    public int CandidateProfileId { get; set; }
    public int RoleId { get; set; }
    public int ScrapeRunId { get; set; }

    /// <summary>0–100.</summary>
    public int Score { get; set; }

    public required string Rationale { get; set; }

    /// <summary>Per-signal detail as JSON, filled in as the matching ladder grows. Nullable.</summary>
    public string? Breakdown { get; set; }

    /// <summary>Which stage of the ladder produced this score.</summary>
    public MatchMethod Method { get; set; }

    public DateTimeOffset ScoredAt { get; set; }
}

/// <summary>The matching-ladder stage that produced a <see cref="Match"/>.</summary>
public enum MatchMethod
{
    Rules = 0,
    Embedding = 1,
    Llm = 2,
}
