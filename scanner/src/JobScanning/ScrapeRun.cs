namespace Scanner.JobScanning;

/// <summary>
/// The recorded audit of a single Scan: when it started, and per-company counts and status.
/// What "new since last time" and dedup are computed against.
/// </summary>
public class ScrapeRun
{
    public int Id { get; set; }

    public DateTimeOffset StartedAt { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Per-company outcomes for this run.</summary>
    public ICollection<ScrapeRunEntry> Entries { get; set; } = new List<ScrapeRunEntry>();
}

/// <summary>One company's outcome within a <see cref="ScrapeRun"/>.</summary>
public class ScrapeRunEntry
{
    public int Id { get; set; }

    public int ScrapeRunId { get; set; }

    public required string CompanyId { get; set; }

    public int RolesFound { get; set; }

    public int RolesNew { get; set; }

    /// <summary><c>ok</c>, or a short failure reason when the source could not be read.</summary>
    public string Status { get; set; } = "ok";
}
