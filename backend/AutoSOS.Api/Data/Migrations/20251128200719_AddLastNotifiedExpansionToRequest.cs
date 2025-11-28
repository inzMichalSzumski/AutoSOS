using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoSOS.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLastNotifiedExpansionToRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LastNotifiedExpansion",
                table: "Requests",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastNotifiedExpansion",
                table: "Requests");
        }
    }
}
