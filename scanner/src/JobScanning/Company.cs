namespace Scanner.JobScanning;

/// <summary>
/// A curated employer the scanner watches, identified by a stable <see cref="Slug"/> and
/// carrying one or more careers <see cref="Source"/>s. Authored by hand in
/// <c>companies.yaml</c> — never scraped or discovered.
/// </summary>
public class Company
{
    /// <summary>Stable hand-authored identity from <c>companies.yaml</c>. Primary key.</summary>
    public required string Slug { get; set; }

    public required string Name { get; set; }

    public string? Notes { get; set; }

    /// <summary>Free-form curation tags (e.g. <c>hedge-fund</c>, <c>fintech</c>).</summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>One or more careers-page entries. Owned value objects, not entities.</summary>
    public ICollection<Source> Sources { get; set; } = new List<Source>();
}

/// <summary>
/// One careers-page entry on a <see cref="Company"/>: a URL and an optional <see cref="Ats"/>
/// hint recorded at curation time — which is what sizes the Anti-corruption layer.
/// </summary>
public class Source
{
    public required string Url { get; set; }

    /// <summary>The known applicant-tracking system, or <c>null</c>/<see cref="AtsKind.Html"/>
    /// for bespoke HTML.</summary>
    public AtsKind? Ats { get; set; }
}

/// <summary>The applicant-tracking systems the ACL knows how to read, plus bespoke HTML.</summary>
public enum AtsKind
{
    Html = 0,
    Greenhouse = 1,
    Lever = 2,
    Ashby = 3,
    Workday = 4,
}
