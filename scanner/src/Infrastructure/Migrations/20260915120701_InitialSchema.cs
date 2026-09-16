using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Scanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CandidateProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    Seniority = table.Column<int>(type: "INTEGER", nullable: false),
                    Years = table.Column<int>(type: "INTEGER", nullable: true),
                    Domains = table.Column<string>(type: "TEXT", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: true),
                    Preferences_SeniorityFloor = table.Column<int>(type: "INTEGER", nullable: true),
                    Preferences_Locations = table.Column<string>(type: "TEXT", nullable: false),
                    Preferences_Remoteness = table.Column<int>(type: "INTEGER", nullable: true),
                    Preferences_Industries = table.Column<string>(type: "TEXT", nullable: false),
                    Preferences_PreferredTechnologies = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Slug);
                });

            migrationBuilder.CreateTable(
                name: "Matches",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CandidateProfileId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoleId = table.Column<int>(type: "INTEGER", nullable: false),
                    ScrapeRunId = table.Column<int>(type: "INTEGER", nullable: false),
                    Score = table.Column<int>(type: "INTEGER", nullable: false),
                    Rationale = table.Column<string>(type: "TEXT", nullable: false),
                    Breakdown = table.Column<string>(type: "TEXT", nullable: true),
                    Method = table.Column<int>(type: "INTEGER", nullable: false),
                    ScoredAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CompanyId = table.Column<string>(type: "TEXT", nullable: false),
                    ExternalId = table.Column<string>(type: "TEXT", nullable: true),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: true),
                    Remoteness = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Seniority = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceHash = table.Column<string>(type: "TEXT", nullable: false),
                    FirstSeen = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    LastSeen = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    Embedding = table.Column<byte[]>(type: "BLOB", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScrapeRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScrapeRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Technologies",
                columns: table => new
                {
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Technologies", x => x.Slug);
                });

            migrationBuilder.CreateTable(
                name: "ProfileTechnology",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CandidateProfileId = table.Column<int>(type: "INTEGER", nullable: false),
                    TechnologySlug = table.Column<string>(type: "TEXT", nullable: false),
                    Proficiency = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileTechnology", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileTechnology_CandidateProfiles_CandidateProfileId",
                        column: x => x.CandidateProfileId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Source",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Ats = table.Column<int>(type: "INTEGER", nullable: true),
                    CompanySlug = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Source", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Source_Companies_CompanySlug",
                        column: x => x.CompanySlug,
                        principalTable: "Companies",
                        principalColumn: "Slug",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoleTechnology",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "INTEGER", nullable: false),
                    TechnologySlug = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleTechnology", x => new { x.RoleId, x.TechnologySlug });
                    table.ForeignKey(
                        name: "FK_RoleTechnology_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScrapeRunEntry",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ScrapeRunId = table.Column<int>(type: "INTEGER", nullable: false),
                    CompanyId = table.Column<string>(type: "TEXT", nullable: false),
                    RolesFound = table.Column<int>(type: "INTEGER", nullable: false),
                    RolesNew = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScrapeRunEntry", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScrapeRunEntry_ScrapeRuns_ScrapeRunId",
                        column: x => x.ScrapeRunId,
                        principalTable: "ScrapeRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TechnologyAlias",
                columns: table => new
                {
                    Alias = table.Column<string>(type: "TEXT", nullable: false),
                    TechnologySlug = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TechnologyAlias", x => x.Alias);
                    table.ForeignKey(
                        name: "FK_TechnologyAlias_Technologies_TechnologySlug",
                        column: x => x.TechnologySlug,
                        principalTable: "Technologies",
                        principalColumn: "Slug",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Matches_CandidateProfileId_RoleId_ScrapeRunId",
                table: "Matches",
                columns: new[] { "CandidateProfileId", "RoleId", "ScrapeRunId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileTechnology_CandidateProfileId",
                table: "ProfileTechnology",
                column: "CandidateProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_CompanyId_Url",
                table: "Roles",
                columns: new[] { "CompanyId", "Url" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScrapeRunEntry_ScrapeRunId",
                table: "ScrapeRunEntry",
                column: "ScrapeRunId");

            migrationBuilder.CreateIndex(
                name: "IX_Source_CompanySlug",
                table: "Source",
                column: "CompanySlug");

            migrationBuilder.CreateIndex(
                name: "IX_TechnologyAlias_TechnologySlug",
                table: "TechnologyAlias",
                column: "TechnologySlug");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Matches");

            migrationBuilder.DropTable(
                name: "ProfileTechnology");

            migrationBuilder.DropTable(
                name: "RoleTechnology");

            migrationBuilder.DropTable(
                name: "ScrapeRunEntry");

            migrationBuilder.DropTable(
                name: "Source");

            migrationBuilder.DropTable(
                name: "TechnologyAlias");

            migrationBuilder.DropTable(
                name: "CandidateProfiles");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "ScrapeRuns");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "Technologies");
        }
    }
}
