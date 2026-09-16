using Microsoft.EntityFrameworkCore;
using Scanner.CandidateProfile;
using Scanner.JobScanning;
using Scanner.Matching;
using Scanner.SharedKernel;

namespace Scanner.Infrastructure;

/// <summary>
/// The one SQLite store, mapping all six contexts' entities. Infrastructure is the only
/// project that references every context: the domain projects stay persistence-ignorant
/// (onion arrangement), so the reference graph is acyclic — Infrastructure → contexts →
/// SharedKernel — and no context ever references another. The seal is compile-time real.
/// </summary>
public class ScannerDbContext : DbContext
{
    public ScannerDbContext(DbContextOptions<ScannerDbContext> options) : base(options) { }

    // Shared Kernel
    public DbSet<Technology> Technologies => Set<Technology>();

    // Job Scanning
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<ScrapeRun> ScrapeRuns => Set<ScrapeRun>();

    // Candidate Profile
    public DbSet<CandidateProfile.CandidateProfile> CandidateProfiles => Set<CandidateProfile.CandidateProfile>();

    // Matching
    public DbSet<Match> Matches => Set<Match>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // ---- Shared Kernel -------------------------------------------------
        b.Entity<Technology>(e =>
        {
            e.HasKey(t => t.Slug);
            e.HasMany(t => t.Aliases)
                .WithOne()
                .HasForeignKey(a => a.TechnologySlug)
                .OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<TechnologyAlias>().HasKey(a => a.Alias);

        // ---- Job Scanning --------------------------------------------------
        b.Entity<Company>(e =>
        {
            e.HasKey(c => c.Slug);
            // Sources are owned value objects, stored in their own table keyed by the company.
            e.OwnsMany(c => c.Sources, s =>
            {
                s.WithOwner().HasForeignKey("CompanySlug");
                s.Property<int>("Id");
                s.HasKey("Id");
            });
        });

        b.Entity<Role>(e =>
        {
            e.HasKey(r => r.Id);
            // Domain identity: (CompanyId, ExternalId ?? Url). Enforced as a unique index on
            // the URL per company; ExternalId is the ATS id where present.
            e.HasIndex(r => new { r.CompanyId, r.Url }).IsUnique();
            e.HasMany(r => r.Technologies)
                .WithOne()
                .HasForeignKey(rt => rt.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<RoleTechnology>().HasKey(rt => new { rt.RoleId, rt.TechnologySlug });

        b.Entity<ScrapeRun>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasMany(r => r.Entries)
                .WithOne()
                .HasForeignKey(x => x.ScrapeRunId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ScrapeRunEntry>().HasKey(x => x.Id);

        // ---- Candidate Profile ---------------------------------------------
        b.Entity<CandidateProfile.CandidateProfile>(e =>
        {
            e.HasKey(p => p.Id);
            e.OwnsOne(p => p.Preferences);
            e.HasMany(p => p.Technologies)
                .WithOne()
                .HasForeignKey(pt => pt.CandidateProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ProfileTechnology>().HasKey(pt => pt.Id);

        // ---- Matching ------------------------------------------------------
        b.Entity<Match>(e =>
        {
            e.HasKey(m => m.Id);
            // One score per (profile, role, run) triple.
            e.HasIndex(m => new { m.CandidateProfileId, m.RoleId, m.ScrapeRunId }).IsUnique();
        });
    }
}
