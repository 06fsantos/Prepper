using Scanner.SharedKernel;

namespace Scanner.JobScanning;

/// <summary>
/// A single open position, <b>normalized</b> — the clean internal shape the Anti-corruption
/// layer emits, never the raw page. Identified in the domain by
/// <c>(CompanyId, ExternalId ?? Url)</c>; a surrogate <see cref="Id"/> carries that identity
/// in storage and gives Matching a stable id to reference by.
/// </summary>
public class Role
{
    public int Id { get; set; }

    /// <summary>The owning <see cref="Company.Slug"/>.</summary>
    public required string CompanyId { get; set; }

    /// <summary>The ATS's own posting id where one exists; falls back to <see cref="Url"/>
    /// for the domain identity.</summary>
    public string? ExternalId { get; set; }

    public required string Url { get; set; }

    public required string Title { get; set; }

    public string? Location { get; set; }

    public Remoteness Remoteness { get; set; } = Remoteness.Unknown;

    public string? Description { get; set; }

    public Seniority Seniority { get; set; } = Seniority.Unknown;

    /// <summary>Canonical <see cref="Technology"/> tags the ACL extracted from the posting.</summary>
    public ICollection<RoleTechnology> Technologies { get; set; } = new List<RoleTechnology>();

    /// <summary>Hash of the source payload — the dedup / change-detection signal.</summary>
    public required string SourceHash { get; set; }

    public DateTimeOffset FirstSeen { get; set; }

    public DateTimeOffset LastSeen { get; set; }

    /// <summary>
    /// The role's embedding vector, stored as a BLOB (SQLite has no vector type; ticket 10).
    /// Populated by the embedding stage of the matching ladder; null until then.
    /// </summary>
    public byte[]? Embedding { get; set; }
}

/// <summary>Join row tying a <see cref="Role"/> to a canonical <see cref="Technology"/>.</summary>
public class RoleTechnology
{
    public int RoleId { get; set; }
    public required string TechnologySlug { get; set; }
}
