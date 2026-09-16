using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Scanner.Infrastructure;

// The scanner's entry point, on the Generic Host so DI/config/logging are wired once and the
// later scheduled Worker / ASP.NET shell is a hosting swap, not a rewrite.
var builder = Host.CreateApplicationBuilder(args);

var dbPath = Environment.GetEnvironmentVariable("SCANNER_DB")
    ?? InfrastructureServiceCollectionExtensions.DefaultDbFileName;
builder.Services.AddScannerInfrastructure(dbPath);

var host = builder.Build();

var command = args.FirstOrDefault() ?? "scan";
switch (command)
{
    case "scan":
        await RunScan(host.Services);
        return 0;
    default:
        Console.Error.WriteLine($"Unknown command '{command}'. Known commands: scan");
        return 1;
}

// v1 stub: resolve DI, apply migrations so the SQLite file exists, report, exit. The real
// pass (ACL → matching ladder → persist) is ticket 12; SQLite is the sole source of truth.
static async Task RunScan(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<ScannerDbContext>();

    await db.Database.MigrateAsync();

    var companies = await db.Companies.CountAsync();
    logger.LogInformation("scan: database ready, {CompanyCount} companies curated. (v1 stub — no scrape yet.)", companies);
}

// Named partial so ILogger<Program> has a category in a top-level-statements program.
public partial class Program { }
