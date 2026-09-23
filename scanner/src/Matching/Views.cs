namespace Scanner.Matching;

/// <summary>
/// The read-only view of a <c>Role</c> the scan orchestrator hands Matching. Matching stays
/// sealed (<i>by id only</i>): it never navigates into Job Scanning's object graph, so the
/// orchestrator flattens what the ladder needs into primitives — <see cref="Seniority"/> is the
/// numeric band (the orchestrator casts the Shared Kernel enum), never the enum itself, which is
/// why this context references neither Job Scanning nor the Shared Kernel.
/// </summary>
public sealed record RoleView
{
    public required int RoleId { get; init; }
    public required string Title { get; init; }
    public IReadOnlyList<string> TechnologySlugs { get; init; } = Array.Empty<string>();

    /// <summary>The seniority band as a number on the shared scale (Unknown=0, Intern=1,
    /// Junior=2, Mid=3, Senior=4, Staff=5, Lead=6, Principal=7).</summary>
    public required int Seniority { get; init; }

    public string? Location { get; init; }

    /// <summary>The owning Company's curation tags (e.g. <c>hedge-fund</c>) — the industry signal,
    /// carried across the JobScanning→Matching boundary as data so no navigation is needed.</summary>
    public IReadOnlyList<string> CompanyIndustryTags { get; init; } = Array.Empty<string>();
}

/// <summary>
/// The read-only view of the <c>CandidateProfile</c> the ladder ranks against — again flattened
/// to primitives so Matching stays sealed.
/// </summary>
public sealed record ProfileView
{
    public required int CandidateProfileId { get; init; }
    public IReadOnlyList<string> PrimaryTechnologies { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> SecondaryTechnologies { get; init; } = Array.Empty<string>();

    /// <summary>The seniority floor as a soft scoring <i>target</i> (numeric band), not the hard
    /// cut — the hard cut sits lower, at ≤ Junior (ticket 11).</summary>
    public required int SeniorityFloor { get; init; }

    public IReadOnlyList<string> Industries { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> PreferredTechnologies { get; init; } = Array.Empty<string>();
}

/// <summary>
/// The ladder's output for one role: a 0–100 <see cref="Score"/>, a terse human
/// <see cref="Rationale"/> for the manual scroll, the per-signal <see cref="Breakdown"/> JSON,
/// and the <see cref="MatchMethod"/> that produced it. A pruned role yields <c>null</c>, not a
/// zero — it gets no <c>Match</c> row at all.
/// </summary>
public sealed record MatchResult(int Score, string Rationale, string Breakdown, MatchMethod Method);
