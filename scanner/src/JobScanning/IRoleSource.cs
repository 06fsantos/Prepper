namespace Scanner.JobScanning;

/// <summary>
/// The seam Job Scanning depends on: one implementation <b>per <see cref="SourceKind"/></b>
/// (Greenhouse, Workday, Html), selected by a <see cref="Source"/>'s Kind. An adapter owns
/// <b>fetch + per-source field-mapping</b> and emits <see cref="CandidateRole"/>s — the raw,
/// pre-normalized shape. Everything ATS-independent (Technology tagging, dedup hashing,
/// missing-field handling) is the shared <see cref="RoleNormalizer"/>'s job, downstream of every
/// adapter. Adding a company or ATS is a new <see cref="Source"/> row or a new adapter, never a
/// change to the scanner's core.
/// </summary>
public interface IRoleSource
{
    /// <summary>The Kind this adapter reads. The registry keys off it.</summary>
    SourceKind Kind { get; }

    /// <summary>Fetch and field-map one Source into candidate roles. Throws on a fetch failure;
    /// the caller records the failure per-source and moves on (one dead source never fails the
    /// whole Scan, and a failed source closes no roles).</summary>
    Task<IReadOnlyList<CandidateRole>> FetchAsync(string companyId, Source source, CancellationToken ct);
}

/// <summary>
/// The raw, per-source shape an <see cref="IRoleSource"/> emits before the shared
/// <see cref="RoleNormalizer"/> turns it into a canonical <see cref="Role"/>. Carries only what
/// an adapter can read off its payload; the normalizer fills the rest (tags, seniority, hash).
/// </summary>
public sealed record CandidateRole
{
    public required string CompanyId { get; init; }

    /// <summary>The ATS's own posting id where one exists; the normalizer falls back to
    /// <see cref="Url"/> for identity.</summary>
    public string? ExternalId { get; init; }

    public required string Url { get; init; }

    public required string Title { get; init; }

    public string? Location { get; init; }

    /// <summary>The description as the source gave it — HTML or plain text. The normalizer
    /// strips it to plain text before storing, hashing, and tagging.</summary>
    public string? Description { get; init; }
}
