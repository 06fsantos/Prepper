using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Scanner.Infrastructure.Acl;

/// <summary>
/// The shared good-citizen policy of the Anti-corruption layer, as one <see cref="DelegatingHandler"/>
/// on the <see cref="HttpClient"/> every <c>IRoleSource</c> uses — not re-implemented per adapter
/// (ticket 09). It does three things to every outbound request: attaches an honest identifying
/// <c>User-Agent</c>, fetches and honours each host's <c>robots.txt</c>, and rate-limits to a
/// trickle per host. The one hard line: <b>no anti-bot evasion</b> — a 403/robots block is
/// surfaced as a failure, never retried with spoofing.
/// </summary>
public sealed class PolitenessHandler : DelegatingHandler
{
    public const string UserAgent = "PrepperScanner/1.0 (personal job-search tool)";

    // ~1 req/s per host — the roster is ~10 companies, not a crawl.
    static readonly TimeSpan MinInterval = TimeSpan.FromMilliseconds(1000);

    readonly ILogger<PolitenessHandler> _log;
    readonly ConcurrentDictionary<string, SemaphoreSlim> _hostGates = new();
    readonly ConcurrentDictionary<string, DateTimeOffset> _lastRequest = new();
    readonly ConcurrentDictionary<string, Task<RobotsRules>> _robots = new();

    public PolitenessHandler(ILogger<PolitenessHandler> log) => _log = log;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var uri = request.RequestUri!;
        if (!request.Headers.UserAgent.Any())
            request.Headers.UserAgent.ParseAdd(UserAgent);

        // robots.txt itself bypasses the check (else infinite recursion); everything else is gated.
        if (!uri.AbsolutePath.Equals("/robots.txt", StringComparison.OrdinalIgnoreCase))
        {
            var rules = await _robots.GetOrAdd(uri.Host, h => FetchRobotsAsync(uri, ct));
            if (!rules.IsAllowed(uri.AbsolutePath))
                throw new HttpRequestException(
                    $"robots.txt disallows {uri.AbsolutePath} on {uri.Host} — not fetched (no evasion).");
        }

        await ThrottleAsync(uri.Host, ct);
        return await base.SendAsync(request, ct);
    }

    async Task ThrottleAsync(string host, CancellationToken ct)
    {
        var gate = _hostGates.GetOrAdd(host, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            if (_lastRequest.TryGetValue(host, out var last))
            {
                var wait = MinInterval - (DateTimeOffset.UtcNow - last);
                if (wait > TimeSpan.Zero) await Task.Delay(wait, ct);
            }
            _lastRequest[host] = DateTimeOffset.UtcNow;
        }
        finally { gate.Release(); }
    }

    async Task<RobotsRules> FetchRobotsAsync(Uri uri, CancellationToken ct)
    {
        var robotsUri = new Uri(uri, "/robots.txt");
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, robotsUri);
            req.Headers.UserAgent.ParseAdd(UserAgent);
            using var resp = await base.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
                return RobotsRules.AllowAll; // 404/unreachable → no restrictions (RFC 9309)
            var body = await resp.Content.ReadAsStringAsync(ct);
            return RobotsRules.Parse(body);
        }
        catch (Exception ex)
        {
            _log.LogDebug(ex, "robots.txt fetch failed for {Host}; treating as allow-all.", uri.Host);
            return RobotsRules.AllowAll;
        }
    }
}

/// <summary>A minimal RFC-9309 robots reading: the Disallow prefixes that apply to our agent
/// (the <c>*</c> group, or a group naming us). Advisory-honoured, not access control.</summary>
public sealed class RobotsRules
{
    readonly List<string> _disallow;
    RobotsRules(List<string> disallow) => _disallow = disallow;

    public static readonly RobotsRules AllowAll = new(new List<string>());

    public bool IsAllowed(string path) =>
        !_disallow.Any(d => d.Length > 0 && path.StartsWith(d, StringComparison.OrdinalIgnoreCase));

    public static RobotsRules Parse(string body)
    {
        // Collect Disallow rules for the applicable groups: '*' and any group naming our token.
        var disallow = new List<string>();
        var applies = false;
        foreach (var raw in body.Split('\n'))
        {
            var line = raw;
            var hash = line.IndexOf('#');
            if (hash >= 0) line = line[..hash];
            line = line.Trim();
            if (line.Length == 0) continue;

            var colon = line.IndexOf(':');
            if (colon < 0) continue;
            var field = line[..colon].Trim().ToLowerInvariant();
            var value = line[(colon + 1)..].Trim();

            if (field == "user-agent")
                applies = value == "*" || value.Contains("prepperscanner", StringComparison.OrdinalIgnoreCase);
            else if (field == "disallow" && applies && value.Length > 0)
                disallow.Add(value);
        }
        return new RobotsRules(disallow);
    }
}
