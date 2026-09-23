using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AngleSharp.Html.Parser;
using Microsoft.Extensions.Logging;
using Scanner.JobScanning;

namespace Scanner.Infrastructure.Acl;

/// <summary>
/// The Greenhouse <see cref="IRoleSource"/>: one public GET against the boards JSON API
/// (<c>boards-api.greenhouse.io</c>, one unified host for US and EU boards). The cleanest case —
/// no HTML, no browser, clean ids. Covers Marshall Wace (5 boards), Man Group, XTX, Squarepoint.
/// </summary>
public sealed class GreenhouseRoleSource : IRoleSource
{
    readonly HttpClient _http;
    public GreenhouseRoleSource(HttpClient http) => _http = http;

    public SourceKind Kind => SourceKind.Greenhouse;

    public async Task<IReadOnlyList<CandidateRole>> FetchAsync(string companyId, Source source, CancellationToken ct)
    {
        var token = source.BoardToken
            ?? throw new InvalidOperationException($"Greenhouse source for '{companyId}' has no BoardToken.");
        var url = $"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true";

        using var resp = await _http.GetAsync(url, ct);
        resp.EnsureSuccessStatusCode();
        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        var roles = new List<CandidateRole>();
        if (!doc.RootElement.TryGetProperty("jobs", out var jobs)) return roles;

        foreach (var j in jobs.EnumerateArray())
        {
            var title = Str(j, "title");
            var link = Str(j, "absolute_url");
            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(link)) continue; // actionable minimum

            string? location = j.TryGetProperty("location", out var loc) && loc.ValueKind == JsonValueKind.Object
                ? Str(loc, "name") : null;
            string? content = Str(j, "content");
            string? extId = j.TryGetProperty("id", out var id) ? id.GetRawText() : null;

            roles.Add(new CandidateRole
            {
                CompanyId = companyId,
                ExternalId = extId,
                Url = link!,
                Title = title!,
                Location = location,
                Description = content,
            });
        }
        return roles;
    }

    static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}

/// <summary>
/// The Workday <see cref="IRoleSource"/>: the CXS JSON endpoint every <c>*.myworkdayjobs.com</c>
/// tenant exposes. <b>POST</b> (not GET) with a JSON body, paginated by <c>offset += 20</c> (the
/// page size is hard-capped at 20 — a larger limit silently returns empty). A best-effort detail
/// GET per posting fills the description. Covers IG Group, FNZ, Fidelity International.
/// </summary>
public sealed class WorkdayRoleSource : IRoleSource
{
    const int PageSize = 20; // Workday's hard cap; a larger limit silently returns empty.

    readonly HttpClient _http;
    readonly ILogger<WorkdayRoleSource> _log;
    public WorkdayRoleSource(HttpClient http, ILogger<WorkdayRoleSource> log) { _http = http; _log = log; }

    public SourceKind Kind => SourceKind.Workday;

    public async Task<IReadOnlyList<CandidateRole>> FetchAsync(string companyId, Source source, CancellationToken ct)
    {
        var tenant = source.Tenant ?? throw new InvalidOperationException($"Workday source for '{companyId}' has no Tenant.");
        var host = source.WorkdayHost ?? throw new InvalidOperationException($"Workday source for '{companyId}' has no WorkdayHost.");
        var site = source.Site ?? throw new InvalidOperationException($"Workday source for '{companyId}' has no Site.");

        var baseUrl = $"https://{tenant}.{host}.myworkdayjobs.com";
        var listUrl = $"{baseUrl}/wday/cxs/{tenant}/{site}/jobs";

        var roles = new List<CandidateRole>();
        int offset = 0, total = int.MaxValue;

        while (true)
        {
            var payload = $$"""{"appliedFacets":{},"limit":{{PageSize}},"offset":{{offset}},"searchText":""}""";
            using var body = new StringContent(payload, Encoding.UTF8, "application/json");
            using var resp = await _http.PostAsync(listUrl, body, ct);
            resp.EnsureSuccessStatusCode();
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;

            // Workday reports the grand total ONLY on the first page; later pages report total:0
            // while still returning postings. So read total once and paginate on the returned
            // count, not on a per-page total that resets to zero.
            if (offset == 0 && root.TryGetProperty("total", out var t) && t.TryGetInt32(out var n))
                total = n;
            if (!root.TryGetProperty("jobPostings", out var postings) || postings.GetArrayLength() == 0) break;

            foreach (var p in postings.EnumerateArray())
            {
                var title = Str(p, "title");
                var extPath = Str(p, "externalPath");
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(extPath)) continue;

                var url = $"{baseUrl}/{site}{extPath}";
                var location = Str(p, "locationsText");
                string? reqId = p.TryGetProperty("bulletFields", out var bf)
                    && bf.ValueKind == JsonValueKind.Array && bf.GetArrayLength() > 0
                    ? bf[0].GetString() : null;

                var description = await FetchDescriptionAsync(baseUrl, tenant, site, extPath!, ct);

                roles.Add(new CandidateRole
                {
                    CompanyId = companyId,
                    ExternalId = reqId,
                    Url = url,
                    Title = title!,
                    Location = location,
                    Description = description,
                });
            }

            var returned = postings.GetArrayLength();
            offset += PageSize;
            if (returned < PageSize) break;   // a short page is the last one
            if (offset >= total) break;        // reached the grand total from page one
        }
        return roles;
    }

    async Task<string?> FetchDescriptionAsync(string baseUrl, string tenant, string site, string extPath, CancellationToken ct)
    {
        try
        {
            var detailUrl = $"{baseUrl}/wday/cxs/{tenant}/{site}/job{extPath}";
            using var resp = await _http.GetAsync(detailUrl, ct);
            if (!resp.IsSuccessStatusCode) return null;
            await using var s = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(s, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("jobPostingInfo", out var info))
                return Str(info, "jobDescription");
        }
        catch (Exception ex)
        {
            _log.LogDebug(ex, "Workday detail fetch failed for {Path}; keeping title-only.", extPath);
        }
        return null;
    }

    static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}

/// <summary>
/// The bespoke server-rendered HTML <see cref="IRoleSource"/> — the cheap tail of the fetch
/// ladder, read with AngleSharp. v1 targets G-Research, whose vacancies are plain
/// <c>&lt;a href="/vacancies/{slug}/"&gt;</c> links in the delivered markup. A JS-rendered site
/// (Qube-RT) is a <see cref="SourceKind.Headless"/> Source with no adapter, so it never reaches
/// this class.
/// </summary>
public sealed class HtmlRoleSource : IRoleSource
{
    static readonly Regex VacancyHref = new(@"/vacancies/(?<slug>[^/?#]+)/?$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    readonly HttpClient _http;
    public HtmlRoleSource(HttpClient http) => _http = http;

    public SourceKind Kind => SourceKind.Html;

    public async Task<IReadOnlyList<CandidateRole>> FetchAsync(string companyId, Source source, CancellationToken ct)
    {
        using var resp = await _http.GetAsync(source.Url, ct);
        resp.EnsureSuccessStatusCode();
        var html = await resp.Content.ReadAsStringAsync(ct);

        var doc = new HtmlParser().ParseDocument(html);
        var baseUri = new Uri(source.Url);
        var seen = new HashSet<string>();
        var roles = new List<CandidateRole>();

        foreach (var a in doc.QuerySelectorAll("a[href]"))
        {
            var href = a.GetAttribute("href") ?? "";
            var m = VacancyHref.Match(href);
            if (!m.Success) continue;

            var slug = m.Groups["slug"].Value;
            var abs = new Uri(baseUri, href).ToString();
            if (!seen.Add(abs)) continue;

            var title = a.TextContent.Trim();
            if (title.Length == 0) continue;

            roles.Add(new CandidateRole
            {
                CompanyId = companyId,
                ExternalId = slug,
                Url = abs,
                Title = title,
                Location = null,
                Description = null,
            });
        }
        return roles;
    }
}

/// <summary>
/// Resolves a <see cref="Source"/>'s <see cref="SourceKind"/> to the <see cref="IRoleSource"/>
/// that reads it. A Kind with no registered adapter (e.g. <see cref="SourceKind.Headless"/>)
/// resolves to <c>null</c> — the scan records that Source skipped-with-reason rather than failing.
/// </summary>
public sealed class RoleSourceRegistry
{
    readonly IReadOnlyDictionary<SourceKind, IRoleSource> _byKind;

    public RoleSourceRegistry(IEnumerable<IRoleSource> sources) =>
        _byKind = sources.ToDictionary(s => s.Kind);

    public IRoleSource? For(SourceKind kind) => _byKind.GetValueOrDefault(kind);
}
