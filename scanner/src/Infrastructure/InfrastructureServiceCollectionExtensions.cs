using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Scanner.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>The SQLite file the scanner treats as its sole source of truth.</summary>
    public const string DefaultDbFileName = "scanner.db";

    public static string ConnectionString(string dbPath) => $"Data Source={dbPath}";

    /// <summary>Registers the <see cref="ScannerDbContext"/> over SQLite. One call, so the
    /// later scheduled Worker / ASP.NET shell is a hosting swap rather than a rewrite.</summary>
    public static IServiceCollection AddScannerInfrastructure(this IServiceCollection services, string dbPath)
    {
        services.AddDbContext<ScannerDbContext>(o => o.UseSqlite(ConnectionString(dbPath)));
        return services;
    }
}
