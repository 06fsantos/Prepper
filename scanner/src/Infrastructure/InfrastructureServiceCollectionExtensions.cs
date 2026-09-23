using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Scanner.Infrastructure.Acl;
using Scanner.JobScanning;
using Scanner.Matching;

namespace Scanner.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>The SQLite file the scanner treats as its sole source of truth.</summary>
    public const string DefaultDbFileName = "scanner.db";

    public static string ConnectionString(string dbPath) => $"Data Source={dbPath}";

    /// <summary>Registers the <see cref="ScannerDbContext"/> over SQLite, the Anti-corruption
    /// layer (the shared politeness handler, the three <see cref="IRoleSource"/> adapters behind
    /// it, and the registry that resolves a <c>Source</c>'s Kind to its adapter), the shared
    /// role normalizer, and the rules matcher. One call, so the later scheduled Worker / ASP.NET
    /// shell is a hosting swap rather than a rewrite.</summary>
    public static IServiceCollection AddScannerInfrastructure(this IServiceCollection services, string dbPath)
    {
        services.AddDbContext<ScannerDbContext>(o => o.UseSqlite(ConnectionString(dbPath)));

        // ── The Anti-corruption layer ─────────────────────────────────────────
        // Politeness is one shared DelegatingHandler on every adapter's HttpClient.
        services.AddTransient<PolitenessHandler>();

        AddRoleSource<GreenhouseRoleSource>(services);
        AddRoleSource<WorkdayRoleSource>(services);
        AddRoleSource<HtmlRoleSource>(services);
        services.AddScoped<RoleSourceRegistry>();

        // The shared normalizer is stateless and built once from the canonical catalog.
        services.AddSingleton(_ => RoleNormalizer.FromCatalog());

        // ── Matching ──────────────────────────────────────────────────────────
        // Weights default to the ticket-11 split; they are configuration, so this is the one
        // place to swap them once real scan output is available to tune against.
        services.AddSingleton(new RulesMatcher(MatchingWeights.Default));

        return services;
    }

    // Registers a typed HttpClient adapter and exposes it under the IRoleSource seam, so the
    // registry can discover it by Kind. Every adapter shares the politeness handler.
    static void AddRoleSource<T>(IServiceCollection services) where T : class, IRoleSource
    {
        services.AddHttpClient<T>(c => c.Timeout = TimeSpan.FromSeconds(30))
            .AddHttpMessageHandler<PolitenessHandler>();
        services.AddScoped<IRoleSource>(sp => sp.GetRequiredService<T>());
    }
}
