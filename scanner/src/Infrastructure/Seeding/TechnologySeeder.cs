using Microsoft.EntityFrameworkCore;
using Scanner.SharedKernel;

namespace Scanner.Infrastructure.Seeding;

/// <summary>
/// Seeds the Shared Kernel <see cref="Technology"/> vocabulary and its alias map from
/// <see cref="TechnologyCatalog"/> into the store, idempotently — so the canonical slugs the
/// profile presumes (csharp/dotnet/sql-server, …) always resolve, and the roster's tags are
/// drawn from the same list. Adding a technology is a catalog entry, then a re-run; existing
/// rows are left as they are.
/// </summary>
public static class TechnologySeeder
{
    public static async Task SeedAsync(ScannerDbContext db, CancellationToken ct = default)
    {
        var existingSlugs = await db.Technologies.Select(t => t.Slug).ToListAsync(ct);
        var known = new HashSet<string>(existingSlugs, StringComparer.OrdinalIgnoreCase);
        var seenAliases = new HashSet<string>(
            await db.Set<TechnologyAlias>().Select(a => a.Alias).ToListAsync(ct),
            StringComparer.OrdinalIgnoreCase);

        foreach (var entry in TechnologyCatalog.Entries)
        {
            if (known.Add(entry.Slug))
                db.Technologies.Add(new Technology { Slug = entry.Slug, DisplayName = entry.Display });

            foreach (var alias in entry.Aliases)
            {
                var lower = alias.ToLowerInvariant();
                if (lower == entry.Slug) continue;      // the slug is the key, not an alias row
                if (!seenAliases.Add(lower)) continue;  // alias PK is global; first definition wins
                db.Set<TechnologyAlias>().Add(new TechnologyAlias { Alias = lower, TechnologySlug = entry.Slug });
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
