using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Scanner.Infrastructure;

/// <summary>
/// Lets <c>dotnet ef migrations add</c> build the context without booting the host. Migrations
/// are the versioned schema artifact (the ADR's Postgres-swap path lives on this seam).
/// </summary>
public class ScannerDbContextFactory : IDesignTimeDbContextFactory<ScannerDbContext>
{
    public ScannerDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ScannerDbContext>()
            .UseSqlite(InfrastructureServiceCollectionExtensions.ConnectionString(
                InfrastructureServiceCollectionExtensions.DefaultDbFileName))
            .Options;
        return new ScannerDbContext(options);
    }
}
