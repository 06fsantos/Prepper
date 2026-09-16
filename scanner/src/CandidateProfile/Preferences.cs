using Scanner.SharedKernel;

namespace Scanner.CandidateProfile;

/// <summary>
/// The filters, held on the <see cref="CandidateProfile"/>. Split into <b>hard</b> filters
/// (prune before scoring: location, seniority floor) and <b>soft</b> filters (feed the
/// score: industry, preferred-tech). Whether a field prunes or scores is behaviour the
/// matching ladder owns (ticket 11); here the storage shape holds both.
/// </summary>
public class Preferences
{
    // Hard filters — prune before scoring.
    public Seniority? SeniorityFloor { get; set; }
    public List<string> Locations { get; set; } = new();
    public Remoteness? Remoteness { get; set; }

    // Soft filters — feed the score.
    public List<string> Industries { get; set; } = new();
    public List<string> PreferredTechnologies { get; set; } = new();
}
