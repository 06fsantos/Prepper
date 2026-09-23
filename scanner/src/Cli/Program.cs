using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Scanner.Cli;
using Scanner.Infrastructure;

// The scanner's entry point, on the Generic Host so DI/config/logging are wired once and the
// later scheduled Worker / ASP.NET shell is a hosting swap, not a rewrite.
var builder = Host.CreateApplicationBuilder(args);

// The human-facing output is the scan summary; quiet the framework's per-request and per-query
// chatter so it reads cleanly (raise these back up for ACL/EF debugging).
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.Extensions.Http", LogLevel.Warning);

var dbPath = Environment.GetEnvironmentVariable("SCANNER_DB")
    ?? InfrastructureServiceCollectionExtensions.DefaultDbFileName;
builder.Services.AddScannerInfrastructure(dbPath);
builder.Services.AddScoped<ScanRunner>();

var host = builder.Build();

var command = args.FirstOrDefault() ?? "scan";
switch (command)
{
    case "scan":
        return await RunScan(host.Services);
    default:
        Console.Error.WriteLine($"Unknown command '{command}'. Known commands: scan");
        return 1;
}

// One idempotent pass: ACL → normalize → rank → persist. SQLite is the sole source of truth.
static async Task<int> RunScan(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // The committed roster lives next to the executable's working directory; the personal
    // profile lives at a configurable, gitignored path outside the committed scanner/ tree.
    var companiesPath = Environment.GetEnvironmentVariable("SCANNER_COMPANIES") ?? "companies.yaml";
    var profilePath = Environment.GetEnvironmentVariable("SCANNER_PROFILE");

    if (string.IsNullOrWhiteSpace(profilePath))
    {
        logger.LogError(
            "SCANNER_PROFILE is not set. Point it at the gitignored candidate profile, e.g. " +
            "SCANNER_PROFILE=../.scratch/platform-architecture/cv/profile.yaml");
        return 1;
    }
    if (!File.Exists(companiesPath))
    {
        logger.LogError("companies.yaml not found at '{Path}' (set SCANNER_COMPANIES).", companiesPath);
        return 1;
    }
    if (!File.Exists(profilePath))
    {
        logger.LogError("Candidate profile not found at '{Path}' (SCANNER_PROFILE).", profilePath);
        return 1;
    }

    var runner = scope.ServiceProvider.GetRequiredService<ScanRunner>();
    await runner.RunAsync(companiesPath, profilePath);
    return 0;
}

// Named partial so ILogger<Program> has a category in a top-level-statements program.
public partial class Program { }
