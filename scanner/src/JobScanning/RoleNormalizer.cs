using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Scanner.SharedKernel;

namespace Scanner.JobScanning;

/// <summary>
/// The one shared normalizer downstream of every <see cref="IRoleSource"/>: it owns everything
/// that is the same whatever the ATS — HTML-to-plain-text, canonical <see cref="Technology"/>
/// tagging, seniority/remoteness inference, and the <see cref="Role.SourceHash"/> change signal.
/// The DDD boundary is <i>translation per-source, invariants central</i>; this is the central
/// half. It is deliberately pure (no I/O, no DB), so it is unit-testable against plain records.
/// </summary>
public sealed class RoleNormalizer
{
    // slug -> the alias/keyword phrases whose presence tags a role with that slug. Includes the
    // slug itself and every catalog alias; built once from the seeded Shared Kernel vocabulary.
    readonly IReadOnlyDictionary<string, IReadOnlyList<string>> _keywordsBySlug;

    public RoleNormalizer(IReadOnlyDictionary<string, IReadOnlyList<string>> keywordsBySlug)
    {
        _keywordsBySlug = keywordsBySlug;
    }

    /// <summary>Build a normalizer straight from the canonical catalog (the seeded vocabulary).</summary>
    public static RoleNormalizer FromCatalog()
    {
        var map = TechnologyCatalog.Entries.ToDictionary(
            e => e.Slug,
            e => (IReadOnlyList<string>)new[] { e.Slug }.Concat(e.Aliases)
                .Select(a => a.ToLowerInvariant()).Distinct().ToList());
        return new RoleNormalizer(map);
    }

    /// <summary>
    /// Turn a raw <see cref="CandidateRole"/> into a canonical <see cref="Role"/> — description
    /// stripped to plain text, tags extracted, seniority/remoteness inferred, content hashed.
    /// <see cref="Role.FirstSeen"/>/<see cref="Role.LastSeen"/> are the caller's (they are dedup
    /// bookkeeping, set on upsert, not derivable from one payload).
    /// </summary>
    public Role Normalize(CandidateRole raw)
    {
        var description = StripHtml(raw.Description);
        var haystack = ((raw.Title ?? string.Empty) + "\n" + (description ?? string.Empty)).ToLowerInvariant();

        var tags = ExtractTechnologies(haystack)
            .Select(slug => new RoleTechnology { TechnologySlug = slug })
            .ToList();

        var seniority = InferSeniority(raw.Title ?? string.Empty);
        var remoteness = InferRemoteness(
            string.Join(" ", raw.Title, raw.Location, description)); // remoteness is often stated in the body

        var role = new Role
        {
            CompanyId = raw.CompanyId,
            ExternalId = raw.ExternalId,
            Url = raw.Url,
            Title = raw.Title ?? string.Empty,
            Location = raw.Location,
            Remoteness = remoteness,
            Description = description,
            Seniority = seniority,
            Technologies = tags,
            SourceHash = string.Empty, // set below, once the normalized fields are settled
        };
        role.SourceHash = ComputeHash(role);
        return role;
    }

    /// <summary>The change-detection signal: a hash of the <i>normalized content</i> (title,
    /// location, description, link, sorted tags) — the one signal that works whatever the ATS,
    /// so per-ATS freshness fields (updated_at, ids) are deliberately ignored.</summary>
    public static string ComputeHash(Role role)
    {
        var tags = string.Join(",", role.Technologies.Select(t => t.TechnologySlug).OrderBy(s => s));
        var payload = string.Join("",
            role.Title ?? "",
            role.Location ?? "",
            role.Description ?? "",
            role.Url,
            tags);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(bytes);
    }

    // ── Technology tagging ────────────────────────────────────────────────────
    IEnumerable<string> ExtractTechnologies(string lowerHaystack)
    {
        foreach (var (slug, keywords) in _keywordsBySlug)
        {
            if (keywords.Any(k => ContainsWord(lowerHaystack, k)))
                yield return slug;
        }
    }

    // Word-boundary-ish containment: guards against "java" matching "javascript" or "sql"
    // matching "mysql". Punctuation-heavy tokens (c#, .net, c++, kdb+) can't use \b, so the
    // boundary is asserted only where the token edge is alphanumeric — a following "." or "+"
    // (a sentence period, or "C++") is a boundary, not part of the word.
    static bool ContainsWord(string haystack, string needle)
    {
        var escaped = Regex.Escape(needle);
        var left = char.IsLetterOrDigit(needle[0]) ? @"(?<![a-z0-9])" : "";
        var right = char.IsLetterOrDigit(needle[^1]) ? @"(?![a-z0-9])" : "";
        return Regex.IsMatch(haystack, left + escaped + right, RegexOptions.CultureInvariant);
    }

    // ── Seniority / remoteness inference ──────────────────────────────────────
    static Seniority InferSeniority(string title)
    {
        var t = title.ToLowerInvariant();
        // Order matters: check the strongest / most specific bands first.
        if (Has(t, "intern", "internship", "placement", "summer analyst")) return Seniority.Intern;
        if (Has(t, "graduate", "junior", "entry level", "entry-level", "trainee")) return Seniority.Junior;
        if (Has(t, "principal")) return Seniority.Principal;
        if (Has(t, "head of", "vp ", "vice president", "director")) return Seniority.Lead;
        if (Has(t, "lead ", " lead", "team lead", "tech lead")) return Seniority.Lead;
        if (Has(t, "staff")) return Seniority.Staff;
        if (Has(t, "senior", "snr", "sr ", "sr.", "expert", "principal")) return Seniority.Senior;
        if (Has(t, "mid-level", "mid level")) return Seniority.Mid;
        return Seniority.Unknown; // plainly-titled roles stay Unknown — never pruned, never zero-scored
    }

    static Remoteness InferRemoteness(string text)
    {
        var t = text.ToLowerInvariant();
        if (Has(t, "fully remote", "remote-first", "remote first", "100% remote")) return Remoteness.Remote;
        if (Has(t, "hybrid")) return Remoteness.Hybrid;
        if (Has(t, "on-site", "on site", "onsite", "in office", "in-office")) return Remoteness.Onsite;
        if (Has(t, "remote")) return Remoteness.Remote;
        return Remoteness.Unknown;
    }

    static bool Has(string haystack, params string[] needles) =>
        needles.Any(haystack.Contains);

    // ── HTML → plain text ─────────────────────────────────────────────────────
    static readonly Regex TagRe = new("<[^>]+>", RegexOptions.Compiled | RegexOptions.Singleline);
    static readonly Regex WsRe = new(@"[ \t\f\v]+", RegexOptions.Compiled);
    static readonly Regex BlankLinesRe = new(@"(\r?\n\s*){2,}", RegexOptions.Compiled);

    /// <summary>Strip tags and decode entities so hashing, tagging, and any future search index
    /// all read clean text rather than ATS HTML. Cheap and dependency-free — the description is
    /// matched for keywords, not rendered.</summary>
    public static string? StripHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;
        // Decode first: some ATSs (Greenhouse's ?content=true) return the body HTML-encoded, so
        // the tags only appear as tags after a decode. A second decode below catches entities
        // that were nested inside the tags.
        var decoded = System.Net.WebUtility.HtmlDecode(html);
        var withBreaks = Regex.Replace(decoded, @"<\s*(br|/p|/div|/li|/h[1-6])\s*/?>", "\n",
            RegexOptions.IgnoreCase);
        var text = TagRe.Replace(withBreaks, " ");
        text = System.Net.WebUtility.HtmlDecode(text);
        text = WsRe.Replace(text, " ");
        text = BlankLinesRe.Replace(text, "\n");
        text = text.Trim();
        return text.Length == 0 ? null : text;
    }
}
