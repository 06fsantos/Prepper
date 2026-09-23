using Scanner.JobScanning;
using Scanner.SharedKernel;

namespace Scanner.Domain.Tests;

/// <summary>
/// The shared normalizer is the ATS-independent half of the ACL, and it is pure, so it is
/// asserted directly on <see cref="CandidateRole"/> records — no I/O.
/// </summary>
public class RoleNormalizerTests
{
    readonly RoleNormalizer _n = RoleNormalizer.FromCatalog();

    static CandidateRole Raw(string title, string? description = null, string? location = null) => new()
    {
        CompanyId = "acme",
        Url = "https://acme.example/jobs/1",
        Title = title,
        Location = location,
        Description = description,
    };

    [Fact]
    public void Tags_canonical_technologies_from_title_and_description()
    {
        var role = _n.Normalize(Raw("Senior Software Engineer",
            "<p>You will write <b>C#</b> and .NET on top of SQL Server.</p>"));
        var slugs = role.Technologies.Select(t => t.TechnologySlug).ToList();
        Assert.Contains("csharp", slugs);
        Assert.Contains("dotnet", slugs);
        Assert.Contains("sql-server", slugs);
    }

    [Fact]
    public void Does_not_tag_java_from_the_word_javascript()
    {
        var role = _n.Normalize(Raw("Frontend Engineer", "We use JavaScript and TypeScript."));
        var slugs = role.Technologies.Select(t => t.TechnologySlug).ToList();
        Assert.Contains("javascript", slugs);
        Assert.Contains("typescript", slugs);
        Assert.DoesNotContain("java", slugs);
    }

    [Fact]
    public void Strips_html_to_plain_text()
    {
        var role = _n.Normalize(Raw("Engineer", "<div>Line one<br>Line two &amp; more</div>"));
        Assert.NotNull(role.Description);
        Assert.DoesNotContain("<", role.Description);
        Assert.Contains("&", role.Description); // entity decoded, not left as &amp;
    }

    [Theory]
    [InlineData("Software Engineering Intern", Seniority.Intern)]
    [InlineData("Graduate Software Engineer", Seniority.Junior)]
    [InlineData("Senior C# Developer", Seniority.Senior)]
    [InlineData("Principal Engineer", Seniority.Principal)]
    [InlineData("Software Engineer", Seniority.Unknown)]
    public void Infers_seniority_from_the_title(string title, Seniority expected)
    {
        Assert.Equal(expected, _n.Normalize(Raw(title)).Seniority);
    }

    [Fact]
    public void Source_hash_is_stable_across_identical_content_and_changes_with_it()
    {
        var a = _n.Normalize(Raw("Engineer", "C# role"));
        var b = _n.Normalize(Raw("Engineer", "C# role"));
        var c = _n.Normalize(Raw("Engineer", "C# role, now with Kafka"));
        Assert.Equal(a.SourceHash, b.SourceHash);
        Assert.NotEqual(a.SourceHash, c.SourceHash);
    }

    [Fact]
    public void Infers_hybrid_remoteness()
    {
        var role = _n.Normalize(Raw("Engineer", "This is a hybrid role.", "London"));
        Assert.Equal(Remoteness.Hybrid, role.Remoteness);
    }
}
