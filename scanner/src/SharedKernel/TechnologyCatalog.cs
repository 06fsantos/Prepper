namespace Scanner.SharedKernel;

/// <summary>
/// The seed of the canonical <see cref="Technology"/> vocabulary and its alias map — the one
/// thing the Shared Kernel exists to share. Infrastructure seeds these rows into the store, and
/// the scraping normalizer builds its keyword matcher from them, so a Role's tags and a
/// Candidate's tags are drawn from the same slugs and are therefore comparable.
///
/// Deliberately hand-curated and finance/.NET-leaning (the roster's centre of gravity). It is
/// meant to grow: a technology absent here is simply not tagged (an accepted false negative,
/// per the ACL design), and adding one is a new entry here — never a code change elsewhere.
/// </summary>
public static class TechnologyCatalog
{
    /// <summary>One canonical technology: its slug, a human label, and the surface variants
    /// that fold onto it (the slug itself is always matched; list only the extra spellings).</summary>
    public sealed record Entry(string Slug, string Display, params string[] Aliases);

    public static readonly IReadOnlyList<Entry> Entries = new[]
    {
        // ── Languages ────────────────────────────────────────────────────────
        new Entry("csharp", "C#", "c#", "c-sharp", "csharp"),
        new Entry("dotnet", ".NET", ".net", "dotnet", ".net core", "dotnet core", ".net framework", "asp.net", "aspnet"),
        new Entry("python", "Python", "python", "python3"),
        new Entry("java", "Java", "java"),
        new Entry("cpp", "C++", "c++", "cpp"),
        new Entry("typescript", "TypeScript", "typescript", "ts"),
        new Entry("javascript", "JavaScript", "javascript", "js", "ecmascript"),
        new Entry("go", "Go", "golang", "go lang"),
        new Entry("rust", "Rust", "rust"),
        new Entry("scala", "Scala", "scala"),
        new Entry("kdb", "kdb+/q", "kdb", "kdb+", "kdb/q", "q/kdb"),
        new Entry("r-lang", "R", "r language", "r programming"),

        // ── Data / storage ───────────────────────────────────────────────────
        new Entry("sql-server", "SQL Server", "sql server", "sqlserver", "mssql", "ms sql", "t-sql", "tsql"),
        new Entry("mysql", "MySQL", "mysql"),
        new Entry("postgres", "PostgreSQL", "postgres", "postgresql", "psql"),
        new Entry("sql", "SQL", "sql"),
        new Entry("kafka", "Kafka", "kafka"),
        new Entry("redis", "Redis", "redis"),
        new Entry("mongodb", "MongoDB", "mongodb", "mongo"),

        // ── Platforms / infra ────────────────────────────────────────────────
        new Entry("aws", "AWS", "aws", "amazon web services"),
        new Entry("azure", "Azure", "azure", "microsoft azure"),
        new Entry("gcp", "GCP", "gcp", "google cloud"),
        new Entry("kubernetes", "Kubernetes", "kubernetes", "k8s"),
        new Entry("docker", "Docker", "docker"),
        new Entry("terraform", "Terraform", "terraform"),
        new Entry("linux", "Linux", "linux", "unix"),
        new Entry("jenkins", "Jenkins", "jenkins"),
        new Entry("git", "Git", "git"),

        // ── Web / front-end ──────────────────────────────────────────────────
        new Entry("react", "React", "react", "react.js", "reactjs"),
        new Entry("angular", "Angular", "angular", "angularjs"),
        new Entry("jquery", "jQuery", "jquery"),
        new Entry("html", "HTML", "html", "html5"),
        new Entry("css", "CSS", "css", "css3"),

        // ── Testing ──────────────────────────────────────────────────────────
        new Entry("nunit", "NUnit", "nunit"),
    };
}
