using System.Text.Json;

namespace Scanner.Matching;

/// <summary>
/// The weights of the rules formula. Weights are <b>configuration, not constants</b>: with no
/// LLM behind it in v1 this formula <i>is</i> the ranking, so it must be tunable against real
/// scan output (ticket 11). The defaults are the ticket-11 split; the sum of the four maxima is
/// the score ceiling (100 by default).
/// </summary>
public sealed record MatchingWeights
{
    public int Technology { get; init; } = 50;
    public int Seniority { get; init; } = 20;
    public int Industry { get; init; } = 20;
    public int PreferredTech { get; init; } = 10;

    /// <summary>How much a <i>primary</i> profile technology counts relative to a secondary one.</summary>
    public double PrimaryMultiplier { get; init; } = 2.0;

    /// <summary>The weighted-match total at which the technology sub-score saturates. 4.0 = two
    /// primary matches (2 × 2×) reach full technology points, so a role needn't list the whole
    /// stack to rank well.</summary>
    public double TechnologySaturation { get; init; } = 4.0;

    public static readonly MatchingWeights Default = new();
}

/// <summary>
/// v1's entire ranker: the rules rung of the matching ladder (ticket 11). Deterministic, zero
/// network, zero keys — a 0–100 score whose job is to <b>rank and filter</b> a shortlist the
/// owner scrolls and decides by hand, never to decide. Embeddings and the LLM re-rank are
/// designed-but-deferred rungs; <see cref="MatchMethod"/> is always <see cref="MatchMethod.Rules"/>
/// here, and the <c>Match</c> shape already records the later rungs without a migration.
/// </summary>
public sealed class RulesMatcher
{
    readonly MatchingWeights _w;

    public RulesMatcher(MatchingWeights? weights = null) => _w = weights ?? MatchingWeights.Default;

    // Shared-scale bands used by the hard filter.
    const int SeniorityUnknown = 0;
    const int SeniorityJunior = 2;

    /// <summary>
    /// Score one role, or return <c>null</c> if the hard filter prunes it (a pruned role gets no
    /// <c>Match</c>). The hard filter is <b>fail-open</b>: it prunes only on a <i>confident</i>
    /// violation — seniority known and ≤ Junior, or a confidently non-UK location. Unknown/Mid
    /// seniority, plainly-titled roles, and unparseable locations are all kept.
    /// </summary>
    public MatchResult? Evaluate(RoleView role, ProfileView profile)
    {
        // ── 1. Hard filter (fail-open) ────────────────────────────────────────
        if (role.Seniority != SeniorityUnknown && role.Seniority <= SeniorityJunior)
            return null;
        if (IsConfidentlyNonUk(role.Location))
            return null;

        // ── 2. Rules formula ──────────────────────────────────────────────────
        var (techPts, matchedPrimary, matchedSecondary) = ScoreTechnology(role, profile);
        var seniorityPts = ScoreSeniority(role, profile);
        var (industryPts, industryMatch) = ScoreIndustry(role, profile);
        var (preferredPts, matchedPreferred) = ScorePreferred(role, profile);

        var score = (int)Math.Round(techPts + seniorityPts + industryPts + preferredPts);
        score = Math.Clamp(score, 0, _w.Technology + _w.Seniority + _w.Industry + _w.PreferredTech);

        var breakdown = JsonSerializer.Serialize(new
        {
            technology = Math.Round(techPts, 1),
            seniority = Math.Round(seniorityPts, 1),
            industry = Math.Round(industryPts, 1),
            preferredTech = Math.Round(preferredPts, 1),
            matchedPrimary,
            matchedSecondary,
            matchedPreferred,
            industryMatch,
            roleSeniority = role.Seniority,
            seniorityFloor = profile.SeniorityFloor,
        });

        var rationale = BuildRationale(matchedPrimary, matchedSecondary, role.Seniority,
            profile.SeniorityFloor, industryMatch);

        return new MatchResult(score, rationale, breakdown, MatchMethod.Rules);
    }

    // ── Technology overlap (max _w.Technology) ────────────────────────────────
    (double points, List<string> primary, List<string> secondary) ScoreTechnology(RoleView role, ProfileView profile)
    {
        var roleTags = new HashSet<string>(role.TechnologySlugs, StringComparer.OrdinalIgnoreCase);
        var primary = profile.PrimaryTechnologies.Where(roleTags.Contains).ToList();
        var secondary = profile.SecondaryTechnologies.Where(roleTags.Contains).ToList();
        var weighted = primary.Count * _w.PrimaryMultiplier + secondary.Count;
        var fraction = Math.Min(1.0, weighted / _w.TechnologySaturation);
        return (fraction * _w.Technology, primary, secondary);
    }

    // ── Seniority proximity (max _w.Seniority) ────────────────────────────────
    double ScoreSeniority(RoleView role, ProfileView profile)
    {
        if (role.Seniority == SeniorityUnknown)
            return 0.6 * _w.Seniority; // neutral mid, never zero — Unknown is common and not a demerit
        var distance = Math.Abs(role.Seniority - profile.SeniorityFloor);
        var fraction = Math.Max(0.0, 1.0 - distance * 0.25); // exact = full; each band off = −25%
        return fraction * _w.Seniority;
    }

    // ── Industry (max _w.Industry) ────────────────────────────────────────────
    (double points, string? match) ScoreIndustry(RoleView role, ProfileView profile)
    {
        var industries = new HashSet<string>(profile.Industries, StringComparer.OrdinalIgnoreCase);
        var tags = role.CompanyIndustryTags;

        // The narrow, high-signal industries rank above the broad base.
        var strong = tags.FirstOrDefault(t =>
            industries.Contains(t) && (t.Equals("hedge-fund", StringComparison.OrdinalIgnoreCase)
                                    || t.Equals("systematic-finance", StringComparison.OrdinalIgnoreCase)));
        if (strong != null) return (_w.Industry, strong);

        var broad = tags.FirstOrDefault(industries.Contains);
        if (broad != null) return (0.6 * _w.Industry, broad);

        return (0.0, null);
    }

    // ── Preferred-tech bonus (max _w.PreferredTech) ───────────────────────────
    (double points, List<string> matched) ScorePreferred(RoleView role, ProfileView profile)
    {
        if (profile.PreferredTechnologies.Count == 0) return (0.0, new List<string>());
        var roleTags = new HashSet<string>(role.TechnologySlugs, StringComparer.OrdinalIgnoreCase);
        var matched = profile.PreferredTechnologies.Where(roleTags.Contains).ToList();
        var fraction = (double)matched.Count / profile.PreferredTechnologies.Count;
        return (fraction * _w.PreferredTech, matched);
    }

    // ── Rationale (the one-liner that makes the manual scroll fast) ────────────
    static string BuildRationale(List<string> primary, List<string> secondary, int roleSeniority,
        int floor, string? industryMatch)
    {
        var parts = new List<string>();
        if (primary.Count > 0)
            parts.Add($"Primary stack match ({string.Join(", ", primary)})");
        else if (secondary.Count > 0)
            parts.Add($"Secondary stack ({string.Join(", ", secondary)})");
        else
            parts.Add("No stack overlap");

        parts.Add(roleSeniority == SeniorityUnknown
            ? "seniority unstated"
            : (roleSeniority >= floor ? SeniorityName(roleSeniority) : $"{SeniorityName(roleSeniority)} (below target)"));

        if (industryMatch != null) parts.Add(industryMatch);

        return string.Join("; ", parts) + ".";
    }

    static string SeniorityName(int band) => band switch
    {
        1 => "Intern", 2 => "Junior", 3 => "Mid", 4 => "Senior",
        5 => "Staff", 6 => "Lead", 7 => "Principal", _ => "unknown seniority",
    };

    // ── Location hard filter ──────────────────────────────────────────────────
    static readonly string[] UkTokens =
        { "london", "united kingdom", "uk", "england", "scotland", "wales", "manchester",
          "edinburgh", "cambridge", "oxford", "bristol", "leeds", "glasgow" };

    // A short list of unambiguous non-UK signals. Kept conservative on purpose: the filter is
    // fail-open, so anything not confidently non-UK is kept.
    static readonly string[] NonUkTokens =
        { "new york", "singapore", "hong kong", "tokyo", "paris", "dubai", "amsterdam", "zurich",
          "geneva", "frankfurt", "berlin", "munich", "chicago", "san francisco", "boston",
          "united states", "usa", "u.s.", "germany", "france", "switzerland", "netherlands",
          "japan", "australia", "sydney", "toronto", "mumbai", "bangalore", "shanghai", "beijing" };

    static bool IsConfidentlyNonUk(string? location)
    {
        if (string.IsNullOrWhiteSpace(location)) return false; // unparseable → kept
        var l = location.ToLowerInvariant();
        if (UkTokens.Any(l.Contains)) return false;            // any UK signal → kept
        return NonUkTokens.Any(l.Contains);                    // a clear non-UK signal and no UK one → prune
    }
}
