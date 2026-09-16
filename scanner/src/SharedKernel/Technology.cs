namespace Scanner.SharedKernel;

/// <summary>
/// A canonical skill/technology tag — a lowercased <see cref="Slug"/> (<c>csharp</c>,
/// <c>dotnet</c>, <c>sql-server</c>). Both a Role and a CandidateProfile store these,
/// which is what makes them comparable. The one thing the Shared Kernel exists to share.
/// </summary>
public class Technology
{
    /// <summary>The canonical, lowercased identity (e.g. <c>csharp</c>). Primary key.</summary>
    public required string Slug { get; set; }

    /// <summary>Human-facing label (e.g. <c>C#</c>); the slug is what is compared.</summary>
    public string? DisplayName { get; set; }

    /// <summary>Variants that fold onto this slug (<c>C#</c>, <c>.NET</c>, <c>CSharp</c>).</summary>
    public ICollection<TechnologyAlias> Aliases { get; set; } = new List<TechnologyAlias>();
}

/// <summary>
/// One surface variant folded onto a canonical <see cref="Technology"/>. The alias map is
/// how heterogeneous careers-page text ("C#", ".NET Core") resolves to one comparable tag.
/// </summary>
public class TechnologyAlias
{
    /// <summary>The variant as it appears in the wild (lowercased). Primary key.</summary>
    public required string Alias { get; set; }

    /// <summary>The canonical <see cref="Technology.Slug"/> this alias resolves to.</summary>
    public required string TechnologySlug { get; set; }
}
