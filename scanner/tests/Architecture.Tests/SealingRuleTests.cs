using System.Reflection;
using Xunit;

namespace Scanner.Architecture.Tests;

/// <summary>
/// The seal, asserted at the assembly-reference level — the cheap reference-graph check the
/// scaffold ticket calls for. A context must not reference another context or Infrastructure;
/// the only shared dependency is <c>Scanner.SharedKernel</c>. This tripwires the day someone
/// adds a project reference that a compile would otherwise accept.
/// </summary>
public class SealingRuleTests
{
    static readonly Assembly SharedKernel = typeof(Scanner.SharedKernel.Technology).Assembly;
    static readonly Assembly JobScanning = typeof(Scanner.JobScanning.Company).Assembly;
    static readonly Assembly CandidateProfile = typeof(Scanner.CandidateProfile.CandidateProfile).Assembly;
    static readonly Assembly Matching = typeof(Scanner.Matching.Match).Assembly;
    static readonly Assembly Infrastructure = typeof(Scanner.Infrastructure.ScannerDbContext).Assembly;

    static IEnumerable<string> Refs(Assembly a) =>
        a.GetReferencedAssemblies().Select(r => r.Name!);

    public static IEnumerable<object[]> Contexts() => new[]
    {
        new object[] { JobScanning },
        new object[] { CandidateProfile },
        new object[] { Matching },
    };

    [Theory]
    [MemberData(nameof(Contexts))]
    public void A_context_references_no_other_context(Assembly context)
    {
        var others = new[] { JobScanning, CandidateProfile, Matching }
            .Where(a => a != context)
            .Select(a => a.GetName().Name);

        Assert.DoesNotContain(Refs(context), name => others.Contains(name));
    }

    [Theory]
    [MemberData(nameof(Contexts))]
    public void A_context_does_not_reference_infrastructure(Assembly context)
    {
        // Domain projects stay persistence-ignorant; Infrastructure depends on them, never back.
        Assert.DoesNotContain(Infrastructure.GetName().Name, Refs(context));
    }

    [Fact]
    public void The_shared_kernel_references_no_scanner_project()
    {
        Assert.DoesNotContain(Refs(SharedKernel), name => name!.StartsWith("Scanner."));
    }

    [Fact]
    public void The_contexts_that_compare_technologies_reference_the_shared_kernel()
    {
        // Job Scanning and Candidate Profile store canonical tags and the shared scales, so
        // they depend on the kernel. Matching does not — it references everything by id only,
        // and stores no kernel type — so it is deliberately absent here.
        var kernel = SharedKernel.GetName().Name;
        Assert.Contains(kernel, Refs(JobScanning));
        Assert.Contains(kernel, Refs(CandidateProfile));
        Assert.DoesNotContain(kernel, Refs(Matching));
    }
}
