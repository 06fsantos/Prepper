using Scanner.JobScanning;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Scanner.Infrastructure.Config;

/// <summary>
/// Loads the committed <c>companies.yaml</c> — the hand-authored curated roster that <b>is</b> the
/// target set — into <see cref="Company"/> entities. The scanner never discovers companies; this
/// file is the whole input. Filters are deliberately absent (they live on the Candidate Profile).
/// </summary>
public static class CompaniesFile
{
    static readonly IDeserializer Yaml = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    public static IReadOnlyList<Company> Load(string path)
    {
        using var reader = new StreamReader(path);
        var doc = Yaml.Deserialize<Root>(reader) ?? new Root();
        return (doc.Companies ?? new())
            .Select(c => new Company
            {
                Slug = c.Slug!,
                Name = c.Name!,
                Notes = c.Notes,
                Tags = c.Tags ?? new(),
                Sources = (c.Sources ?? new()).Select(ToSource).ToList(),
            })
            .ToList();
    }

    static Source ToSource(SourceDto s)
    {
        if (!Enum.TryParse<SourceKind>(s.Kind, ignoreCase: true, out var kind))
            throw new InvalidOperationException(
                $"Unknown source kind '{s.Kind}' in companies.yaml (expected {string.Join('/', Enum.GetNames<SourceKind>())}).");
        return new Source
        {
            Kind = kind,
            Url = s.Url!,
            BoardToken = s.BoardToken,
            Tenant = s.Tenant,
            WorkdayHost = s.WorkdayHost,
            Site = s.Site,
        };
    }

    sealed class Root { public List<CompanyDto>? Companies { get; set; } }

    sealed class CompanyDto
    {
        public string? Slug { get; set; }
        public string? Name { get; set; }
        public string? Notes { get; set; }
        public List<string>? Tags { get; set; }
        public List<SourceDto>? Sources { get; set; }
    }

    sealed class SourceDto
    {
        public string? Kind { get; set; }
        public string? Url { get; set; }
        public string? BoardToken { get; set; }
        public string? Tenant { get; set; }
        public string? WorkdayHost { get; set; }
        public string? Site { get; set; }
    }
}
