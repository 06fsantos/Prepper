using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Scanner.CandidateProfile;
using Scanner.Infrastructure;
using Scanner.Infrastructure.Acl;
using Scanner.Infrastructure.Config;
using Scanner.Infrastructure.Seeding;
using Scanner.JobScanning;
using Scanner.Matching;
using Scanner.SharedKernel;

namespace Scanner.Cli;

/// <summary>
/// The end-to-end <c>scan</c> pass (platform-architecture ticket 12): one idempotent run that
/// reads the curated roster, pulls each Source through the Anti-corruption layer into normalized
/// <see cref="Role"/>s, ranks them against the Candidate Profile with the rules ladder, and
/// persists everything to SQLite — the sole source of truth. It emits <b>no report</b>; a later
/// surface reads the store. Re-running bumps <see cref="Role.LastSeen"/> and re-scores without
/// duplicating roles.
/// </summary>
public sealed class ScanRunner
{
    readonly ScannerDbContext _db;
    readonly RoleSourceRegistry _sources;
    readonly RoleNormalizer _normalizer;
    readonly RulesMatcher _matcher;
    readonly ILogger<ScanRunner> _log;

    // The roles touched this run (new or re-seen), collected in memory as they are upserted — the
    // set the ranker scores. Kept in memory because SQLite's EF provider can't translate a
    // DateTimeOffset "seen since the run started" filter to SQL.
    readonly HashSet<Role> _touched = new();

    public ScanRunner(
        ScannerDbContext db, RoleSourceRegistry sources, RoleNormalizer normalizer,
        RulesMatcher matcher, ILogger<ScanRunner> log)
    {
        _db = db;
        _sources = sources;
        _normalizer = normalizer;
        _matcher = matcher;
        _log = log;
    }

    public async Task RunAsync(string companiesPath, string profilePath, CancellationToken ct = default)
    {
        // ── 0. Schema + shared vocabulary ─────────────────────────────────────
        await _db.Database.MigrateAsync(ct);
        await TechnologySeeder.SeedAsync(_db, ct);

        // ── 1. Load the curated inputs into the store ─────────────────────────
        var companies = await UpsertCompaniesAsync(companiesPath, ct);
        var profile = await UpsertProfileAsync(profilePath, ct);

        // ── 2. Open the ScrapeRun ─────────────────────────────────────────────
        var run = new ScrapeRun { StartedAt = DateTimeOffset.UtcNow };
        _db.ScrapeRuns.Add(run);
        await _db.SaveChangesAsync(ct);

        // ── 3. Scrape every Source through the ACL, normalize, upsert ─────────
        foreach (var company in companies)
        {
            var entry = await ScrapeCompanyAsync(company, run, ct);
            run.Entries.Add(entry);
            await _db.SaveChangesAsync(ct);
        }

        // ── 4. Rank the roles seen this run against the profile ───────────────
        var matched = await ScoreAsync(profile, run, ct);

        // ── 5. Close the run ──────────────────────────────────────────────────
        run.CompletedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        ReportSummary(run, matched);
    }

    // ── Curated inputs ────────────────────────────────────────────────────────
    async Task<IReadOnlyList<Company>> UpsertCompaniesAsync(string path, CancellationToken ct)
    {
        var authored = CompaniesFile.Load(path);
        var existing = await _db.Companies.Include(c => c.Sources).ToDictionaryAsync(c => c.Slug, ct);

        foreach (var c in authored)
        {
            if (existing.TryGetValue(c.Slug, out var e))
            {
                e.Name = c.Name;
                e.Notes = c.Notes;
                e.Tags = c.Tags;
                e.Sources.Clear();
                foreach (var s in c.Sources) e.Sources.Add(s);
            }
            else
            {
                _db.Companies.Add(c);
            }
        }
        await _db.SaveChangesAsync(ct);
        _log.LogInformation("Roster: {Count} companies curated.", authored.Count);
        return authored;
    }

    async Task<CandidateProfile.CandidateProfile> UpsertProfileAsync(string path, CancellationToken ct)
    {
        var loaded = ProfileFile.Load(path);
        var profile = await _db.CandidateProfiles.Include(p => p.Technologies).FirstOrDefaultAsync(ct);

        if (profile is null)
        {
            _db.CandidateProfiles.Add(loaded);
            profile = loaded;
        }
        else
        {
            profile.Name = loaded.Name;
            profile.Seniority = loaded.Seniority;
            profile.Years = loaded.Years;
            profile.Domains = loaded.Domains;
            profile.Location = loaded.Location;
            profile.Preferences = loaded.Preferences;
            profile.Technologies.Clear();
            foreach (var t in loaded.Technologies) profile.Technologies.Add(t);
        }
        await _db.SaveChangesAsync(ct);
        _log.LogInformation("Profile: {Name}, {Count} technologies.", profile.Name, profile.Technologies.Count);
        return profile;
    }

    // ── Scraping one company ────────────────────────────────────────────────────
    async Task<ScrapeRunEntry> ScrapeCompanyAsync(Company company, ScrapeRun run, CancellationToken ct)
    {
        var existingRoles = await _db.Roles
            .Include(r => r.Technologies)
            .Where(r => r.CompanyId == company.Slug)
            .ToDictionaryAsync(r => r.Url, ct);

        int found = 0, added = 0;
        var failures = new List<string>();
        var skipped = new List<string>();

        foreach (var source in company.Sources)
        {
            var adapter = _sources.For(source.Kind);
            if (adapter is null)
            {
                skipped.Add($"{source.Kind.ToString().ToLowerInvariant()} (no adapter)");
                continue;
            }

            try
            {
                var candidates = await adapter.FetchAsync(company.Slug, source, ct);
                foreach (var candidate in candidates)
                {
                    var normalized = _normalizer.Normalize(candidate);
                    found++;
                    if (UpsertRole(existingRoles, normalized, run.StartedAt)) added++;
                }
            }
            catch (Exception ex)
            {
                // Failures are per-source and non-fatal: one dead source never fails the Scan, and
                // a failed source closes no roles (openness is derived from the latest *success*).
                _log.LogWarning("  {Company}/{Kind}: {Message}", company.Slug, source.Kind, ex.Message);
                failures.Add($"{source.Kind.ToString().ToLowerInvariant()}: {Truncate(ex.Message, 80)}");
            }
        }

        var status = DescribeStatus(failures, skipped);
        _log.LogInformation("  {Company}: {Found} roles ({Added} new). {Status}",
            company.Slug, found, added, status);

        return new ScrapeRunEntry
        {
            CompanyId = company.Slug,
            RolesFound = found,
            RolesNew = added,
            Status = status,
        };
    }

    // Upsert by domain identity (CompanyId, Url). Returns true when the role is new.
    bool UpsertRole(Dictionary<string, Role> existingByUrl, Role normalized, DateTimeOffset seenAt)
    {
        if (existingByUrl.TryGetValue(normalized.Url, out var existing))
        {
            existing.LastSeen = seenAt;
            _touched.Add(existing);
            if (existing.SourceHash != normalized.SourceHash)
            {
                existing.Title = normalized.Title;
                existing.Location = normalized.Location;
                existing.Description = normalized.Description;
                existing.Remoteness = normalized.Remoteness;
                existing.Seniority = normalized.Seniority;
                existing.ExternalId = normalized.ExternalId;
                existing.SourceHash = normalized.SourceHash;
                existing.Technologies.Clear();
                foreach (var t in normalized.Technologies)
                    existing.Technologies.Add(new RoleTechnology { TechnologySlug = t.TechnologySlug });
            }
            return false;
        }

        normalized.FirstSeen = seenAt;
        normalized.LastSeen = seenAt;
        _db.Roles.Add(normalized);
        existingByUrl[normalized.Url] = normalized;
        _touched.Add(normalized);
        return true;
    }

    // ── Ranking ──────────────────────────────────────────────────────────────
    async Task<int> ScoreAsync(CandidateProfile.CandidateProfile profile, ScrapeRun run, CancellationToken ct)
    {
        var profileView = new ProfileView
        {
            CandidateProfileId = profile.Id,
            PrimaryTechnologies = profile.Technologies
                .Where(t => t.Proficiency == Proficiency.Primary).Select(t => t.TechnologySlug).ToList(),
            SecondaryTechnologies = profile.Technologies
                .Where(t => t.Proficiency == Proficiency.Secondary).Select(t => t.TechnologySlug).ToList(),
            SeniorityFloor = (int)(profile.Preferences.SeniorityFloor ?? profile.Seniority),
            Industries = profile.Preferences.Industries,
            PreferredTechnologies = profile.Preferences.PreferredTechnologies,
        };

        var companyTags = await _db.Companies.ToDictionaryAsync(c => c.Slug, c => c.Tags, ct);

        int scored = 0;
        foreach (var role in _touched)
        {
            var view = new RoleView
            {
                RoleId = role.Id,
                Title = role.Title,
                TechnologySlugs = role.Technologies.Select(t => t.TechnologySlug).ToList(),
                Seniority = (int)role.Seniority,
                Location = role.Location,
                CompanyIndustryTags = companyTags.GetValueOrDefault(role.CompanyId) ?? new List<string>(),
            };

            var result = _matcher.Evaluate(view, profileView);
            if (result is null) continue; // hard-filtered: no Match row

            _db.Matches.Add(new Match
            {
                CandidateProfileId = profile.Id,
                RoleId = role.Id,
                ScrapeRunId = run.Id,
                Score = result.Score,
                Rationale = result.Rationale,
                Breakdown = result.Breakdown,
                Method = result.Method,
                ScoredAt = DateTimeOffset.UtcNow,
            });
            scored++;
        }
        await _db.SaveChangesAsync(ct);
        return scored;
    }

    // ── Reporting to the log (not a persisted artifact — SQLite is the truth) ──
    void ReportSummary(ScrapeRun run, int matched)
    {
        var found = run.Entries.Sum(e => e.RolesFound);
        var added = run.Entries.Sum(e => e.RolesNew);
        _log.LogInformation(
            "Scan #{Run} complete: {Companies} companies, {Found} roles ({Added} new), {Matched} scored.",
            run.Id, run.Entries.Count, found, added, matched);

        var top = _db.Matches
            .Where(m => m.ScrapeRunId == run.Id)
            .OrderByDescending(m => m.Score)
            .Take(10)
            .Join(_db.Roles, m => m.RoleId, r => r.Id, (m, r) => new { m.Score, r.Title, r.CompanyId, m.Rationale })
            .ToList();

        if (top.Count == 0) return;
        _log.LogInformation("Top matches this run:");
        foreach (var t in top)
            _log.LogInformation("  [{Score,3}] {Company} — {Title}  ·  {Rationale}",
                t.Score, t.CompanyId, t.Title, t.Rationale);
    }

    static string DescribeStatus(List<string> failures, List<string> skipped)
    {
        if (failures.Count == 0 && skipped.Count == 0) return "ok";
        var parts = new List<string>();
        if (failures.Count > 0) parts.Add("failed: " + string.Join("; ", failures));
        if (skipped.Count > 0) parts.Add("skipped: " + string.Join(", ", skipped));
        return string.Join(" | ", parts);
    }

    static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
