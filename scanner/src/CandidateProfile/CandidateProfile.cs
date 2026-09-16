using Scanner.SharedKernel;

namespace Scanner.CandidateProfile;

/// <summary>
/// The CV turned into data: canonical <see cref="Technology"/> tags (primary vs secondary),
/// seniority, years, domains, location, and <see cref="Preferences"/>. What Matching ranks a
/// Role against. One row today; a table, so multi-tenancy can add rows without a reshape.
/// </summary>
public class CandidateProfile
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public Seniority Seniority { get; set; } = Seniority.Unknown;

    public int? Years { get; set; }

    /// <summary>Domain experience, e.g. <c>fintech</c>.</summary>
    public List<string> Domains { get; set; } = new();

    public string? Location { get; set; }

    /// <summary>Canonical technology tags, each flagged primary or secondary
    /// (never narrowed to one language).</summary>
    public ICollection<ProfileTechnology> Technologies { get; set; } = new List<ProfileTechnology>();

    /// <summary>The filters. Owned by the profile because the match signal is the candidate.</summary>
    public Preferences Preferences { get; set; } = new();
}

/// <summary>How central a <see cref="Technology"/> is to the candidate.</summary>
public enum Proficiency
{
    Secondary = 0,
    Primary = 1,
}

/// <summary>Join row tying a <see cref="CandidateProfile"/> to a canonical technology tag,
/// carrying whether it is a primary or secondary strength.</summary>
public class ProfileTechnology
{
    public int Id { get; set; }
    public int CandidateProfileId { get; set; }
    public required string TechnologySlug { get; set; }
    public Proficiency Proficiency { get; set; }
}
