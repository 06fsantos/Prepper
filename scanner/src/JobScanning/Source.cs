namespace Scanner.JobScanning;

/// <summary>
/// The <see cref="Source"/> Kinds the Anti-corruption layer can read (each has a
/// <see cref="IRoleSource"/> adapter), plus the deferred kinds it records-but-skips. Retires the
/// old free-text <c>ats</c> hint into a shape known at curation time (platform-architecture
/// tickets 08/09).
/// </summary>
public enum SourceKind
{
    /// <summary>Bespoke server-rendered HTML — read with a light HTML parse.</summary>
    Html = 0,

    /// <summary>Greenhouse public boards JSON API (<c>boards-api.greenhouse.io</c>).</summary>
    Greenhouse = 1,

    /// <summary>Workday CXS JSON-over-POST endpoint (<c>{tenant}.wd{N}.myworkdayjobs.com</c>).</summary>
    Workday = 2,

    /// <summary>A JS-rendered site with no adapter yet (e.g. Qube-RT). Recorded on the Company,
    /// but the <see cref="Scanner.JobScanning.ScrapeRun"/> records it skipped-with-reason —
    /// the seam anticipates a future <c>HeadlessRoleSource</c> without building one.</summary>
    Headless = 3,
}

/// <summary>
/// One <b>fetchable endpoint</b> on a <see cref="Company"/> — not a careers page in the abstract
/// but a single place roles are read from. A Company has one or more (a firm that splits roles
/// across five Greenhouse boards has five Sources). Discriminated on <see cref="Kind"/>, which
/// selects the <see cref="IRoleSource"/> that reads it and fixes which of the typed params below
/// are meaningful — so the old <c>ats</c> hint is promoted to a shape the adapter can rely on.
/// An owned value object of its Company, never an entity in its own right.
/// </summary>
public class Source
{
    /// <summary>Which adapter reads this Source, and which params below apply.</summary>
    public SourceKind Kind { get; set; }

    /// <summary>The human-facing careers URL: display for every Kind, and the fetch target
    /// for <see cref="SourceKind.Html"/> / <see cref="SourceKind.Headless"/>.</summary>
    public required string Url { get; set; }

    // ── Greenhouse ──────────────────────────────────────────────────────────
    /// <summary>The Greenhouse board token (e.g. <c>squarepointcapital</c>). One Source per board.</summary>
    public string? BoardToken { get; set; }

    // ── Workday ─────────────────────────────────────────────────────────────
    /// <summary>The Workday tenant (e.g. <c>ig</c>).</summary>
    public string? Tenant { get; set; }

    /// <summary>The Workday host shard (e.g. <c>wd3</c>, <c>wd103</c>).</summary>
    public string? WorkdayHost { get; set; }

    /// <summary>The Workday site slug (e.g. <c>EXT_IG</c>, <c>fnz_careers</c>).</summary>
    public string? Site { get; set; }
}
