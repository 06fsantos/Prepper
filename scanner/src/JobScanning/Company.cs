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

    /// <summary>One or more careers <see cref="Source"/>s. Owned value objects, not entities.</summary>
    public ICollection<Source> Sources { get; set; } = new List<Source>();
}
