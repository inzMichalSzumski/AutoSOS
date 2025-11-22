using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoSOS.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentAndOperatorEquipment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RequiredEquipmentId",
                table: "Requests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Equipment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RequiresTransport = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipment", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OperatorEquipment",
                columns: table => new
                {
                    OperatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperatorEquipment", x => new { x.OperatorId, x.EquipmentId });
                    table.ForeignKey(
                        name: "FK_OperatorEquipment_Equipment_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipment",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperatorEquipment_Operators_OperatorId",
                        column: x => x.OperatorId,
                        principalTable: "Operators",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Requests_RequiredEquipmentId",
                table: "Requests",
                column: "RequiredEquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_OperatorEquipment_EquipmentId",
                table: "OperatorEquipment",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_OperatorEquipment_OperatorId",
                table: "OperatorEquipment",
                column: "OperatorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Equipment_RequiredEquipmentId",
                table: "Requests",
                column: "RequiredEquipmentId",
                principalTable: "Equipment",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Equipment_RequiredEquipmentId",
                table: "Requests");

            migrationBuilder.DropTable(
                name: "OperatorEquipment");

            migrationBuilder.DropTable(
                name: "Equipment");

            migrationBuilder.DropIndex(
                name: "IX_Requests_RequiredEquipmentId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "RequiredEquipmentId",
                table: "Requests");
        }
    }
}
