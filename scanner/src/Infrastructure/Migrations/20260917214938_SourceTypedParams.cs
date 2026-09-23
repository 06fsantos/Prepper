using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Scanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SourceTypedParams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ats",
                table: "Source");

            migrationBuilder.AddColumn<string>(
                name: "BoardToken",
                table: "Source",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "Source",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Site",
                table: "Source",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tenant",
                table: "Source",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkdayHost",
                table: "Source",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BoardToken",
                table: "Source");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Source");

            migrationBuilder.DropColumn(
                name: "Site",
                table: "Source");

            migrationBuilder.DropColumn(
                name: "Tenant",
                table: "Source");

            migrationBuilder.DropColumn(
                name: "WorkdayHost",
                table: "Source");

            migrationBuilder.AddColumn<int>(
                name: "Ats",
                table: "Source",
                type: "INTEGER",
                nullable: true);
        }
    }
}
