namespace Scanner.SharedKernel;

/// <summary>
/// The seniority ladder a Role is normalized onto and a Candidate's Preferences set a floor
/// against. Shared for the same reason <see cref="Technology"/> is: Job Scanning and
/// Candidate Profile must agree on the scale to be comparable (a hard filter prunes a Role
/// below the floor). <c>Unknown</c> is the ACL's answer when a page states no seniority.
/// </summary>
public enum Seniority
{
    Unknown = 0,
    Intern = 1,
    Junior = 2,
    Mid = 3,
    Senior = 4,
    Staff = 5,
    Lead = 6,
    Principal = 7,
}

/// <summary>
/// How on-site a Role is, and what a Candidate's Preferences target. Shared vocabulary for
/// the same comparability reason as <see cref="Seniority"/>.
/// </summary>
public enum Remoteness
{
    Unknown = 0,
    Onsite = 1,
    Hybrid = 2,
    Remote = 3,
}
