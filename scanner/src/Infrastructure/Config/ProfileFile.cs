using Scanner.CandidateProfile;
using Scanner.SharedKernel;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using CandidateProfileEntity = Scanner.CandidateProfile.CandidateProfile;

namespace Scanner.Infrastructure.Config;

/// <summary>
/// Loads the owner's distilled <c>profile.yaml</c> into a <see cref="CandidateProfile"/>. The
/// profile is <b>personal data</b> and lives at a configurable, gitignored path (env
/// <c>SCANNER_PROFILE</c>) outside the committed <c>scanner/</c> tree — the seal ADR 0006 asks for.
/// Enum-valued fields (seniority, proficiency, remoteness) are read as strings and parsed
/// case-insensitively so the YAML reads naturally (<c>Senior</c>, <c>primary</c>).
/// </summary>
public static class ProfileFile
{
    static readonly IDeserializer Yaml = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    public static CandidateProfileEntity Load(string path)
    {
        using var reader = new StreamReader(path);
        var dto = Yaml.Deserialize<ProfileDto>(reader)
            ?? throw new InvalidOperationException($"profile.yaml at '{path}' is empty.");

        var profile = new CandidateProfileEntity
        {
            Name = dto.Name,
            Seniority = ParseEnum(dto.Seniority, Seniority.Unknown),
            Years = dto.Years,
            Domains = dto.Domains ?? new(),
            Location = dto.Location,
            Technologies = (dto.Technologies ?? new())
                .Select(t => new ProfileTechnology
                {
                    TechnologySlug = t.Slug!,
                    Proficiency = ParseEnum(t.Proficiency, Proficiency.Secondary),
                })
                .ToList(),
            Preferences = new Preferences
            {
                SeniorityFloor = string.IsNullOrWhiteSpace(dto.Preferences?.SeniorityFloor)
                    ? null : ParseEnum(dto.Preferences!.SeniorityFloor, Seniority.Unknown),
                Locations = dto.Preferences?.Locations ?? new(),
                Remoteness = string.IsNullOrWhiteSpace(dto.Preferences?.Remoteness)
                    ? null : ParseEnum(dto.Preferences!.Remoteness, Remoteness.Unknown),
                Industries = dto.Preferences?.Industries ?? new(),
                PreferredTechnologies = dto.Preferences?.PreferredTechnologies ?? new(),
            },
        };
        return profile;
    }

    static TEnum ParseEnum<TEnum>(string? value, TEnum fallback) where TEnum : struct =>
        Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) ? parsed : fallback;

    sealed class ProfileDto
    {
        public string? Name { get; set; }
        public string? Seniority { get; set; }
        public int? Years { get; set; }
        public List<string>? Domains { get; set; }
        public string? Location { get; set; }
        public List<TechDto>? Technologies { get; set; }
        public PreferencesDto? Preferences { get; set; }
    }

    sealed class TechDto
    {
        public string? Slug { get; set; }
        public string? Proficiency { get; set; }
    }

    sealed class PreferencesDto
    {
        public string? SeniorityFloor { get; set; }
        public List<string>? Locations { get; set; }
        public string? Remoteness { get; set; }
        public List<string>? Industries { get; set; }
        public List<string>? PreferredTechnologies { get; set; }
    }
}
