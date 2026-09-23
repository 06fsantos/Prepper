using Scanner.Matching;

namespace Scanner.Domain.Tests;

/// <summary>
/// The rules rung is v1's entire ranker, so its behaviour is asserted directly on value objects
/// (no DB, no network) — the seam ticket 11 designed for. Seniority bands are the shared scale as
/// integers (Unknown=0 … Senior=4 …), the same flattening the orchestrator does.
/// </summary>
public class RulesMatcherTests
{
    static ProfileView Profile() => new()
    {
        CandidateProfileId = 1,
        PrimaryTechnologies = new[] { "csharp", "dotnet", "sql-server" },
        SecondaryTechnologies = new[] { "python", "java", "aws" },
        SeniorityFloor = 4, // Senior
        Industries = new[] { "hedge-fund", "systematic-finance", "fintech", "financial-services" },
        PreferredTechnologies = new[] { "csharp", "dotnet", "sql-server" },
    };

    static RoleView Role(string title = "Software Engineer", int seniority = 0,
        string? location = "London", string[]? tech = null, string[]? industry = null) => new()
    {
        RoleId = 42,
        Title = title,
        Seniority = seniority,
        Location = location,
        TechnologySlugs = tech ?? Array.Empty<string>(),
        CompanyIndustryTags = industry ?? Array.Empty<string>(),
    };

    readonly RulesMatcher _m = new();

    [Fact]
    public void Prunes_a_confidently_junior_role()
    {
        // Junior (band 2) is known and ≤ Junior → pruned, no Match.
        Assert.Null(_m.Evaluate(Role(seniority: 2), Profile()));
    }

    [Fact]
    public void Keeps_an_unknown_seniority_role()
    {
        // Unknown (0) is the fail-open case — a plainly-titled role is often senior by another name.
        Assert.NotNull(_m.Evaluate(Role(seniority: 0), Profile()));
    }

    [Fact]
    public void Keeps_a_mid_role()
    {
        Assert.NotNull(_m.Evaluate(Role(seniority: 3), Profile()));
    }

    [Fact]
    public void Prunes_a_confidently_non_uk_role()
    {
        Assert.Null(_m.Evaluate(Role(location: "New York, United States"), Profile()));
    }

    [Fact]
    public void Keeps_a_role_with_both_a_uk_and_a_non_uk_office()
    {
        // A UK signal present → kept, even alongside a non-UK one (fail-open).
        Assert.NotNull(_m.Evaluate(Role(location: "London / New York"), Profile()));
    }

    [Fact]
    public void Keeps_a_role_with_an_unparseable_location()
    {
        Assert.NotNull(_m.Evaluate(Role(location: null), Profile()));
    }

    [Fact]
    public void Primary_stack_and_hedge_fund_outscore_a_bare_role()
    {
        var strong = _m.Evaluate(
            Role(title: "Senior Software Engineer", seniority: 4,
                 tech: new[] { "csharp", "dotnet", "sql-server" },
                 industry: new[] { "hedge-fund", "london" }),
            Profile())!;
        var weak = _m.Evaluate(Role(seniority: 0), Profile())!;

        Assert.True(strong.Score > weak.Score);
        Assert.True(strong.Score >= 90); // full tech + senior + hedge-fund + preferred
        Assert.Equal(MatchMethod.Rules, strong.Method);
        Assert.Contains("Primary stack", strong.Rationale);
    }

    [Fact]
    public void A_narrow_industry_outranks_the_broad_base()
    {
        var hedge = _m.Evaluate(Role(seniority: 4, industry: new[] { "hedge-fund" }), Profile())!;
        var broad = _m.Evaluate(Role(seniority: 4, industry: new[] { "financial-services" }), Profile())!;
        Assert.True(hedge.Score > broad.Score);
    }

    [Fact]
    public void Breakdown_is_json_carrying_the_sub_scores()
    {
        var r = _m.Evaluate(Role(seniority: 4, tech: new[] { "csharp" }), Profile())!;
        Assert.Contains("\"technology\"", r.Breakdown);
        Assert.Contains("\"seniority\"", r.Breakdown);
        Assert.Contains("\"industry\"", r.Breakdown);
    }

    [Fact]
    public void Weights_are_configuration()
    {
        var doubled = new RulesMatcher(new MatchingWeights { Technology = 100 });
        var role = Role(seniority: 4, tech: new[] { "csharp", "dotnet" });
        var boosted = doubled.Evaluate(role, Profile())!;
        var baseline = _m.Evaluate(role, Profile())!;
        Assert.True(boosted.Score > baseline.Score);
    }
}
