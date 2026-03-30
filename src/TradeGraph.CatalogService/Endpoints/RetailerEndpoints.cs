using Microsoft.EntityFrameworkCore;
using TradeGraph.CatalogService.Data;
using TradeGraph.Shared.Models;

namespace TradeGraph.CatalogService.Endpoints;

public static class RetailerEndpoints
{
    public static void MapRetailerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/retailers").WithTags("Retailers");

        group.MapGet("/", async (CatalogDbContext db, int page = 1, int pageSize = 20) =>
        {
            var total = await db.Retailers.CountAsync();
            var items = await db.Retailers
                .OrderBy(r => r.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return Results.Ok(new { total, page, pageSize, items });
        }).WithSummary("List all retailers");

        group.MapGet("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var retailer = await db.Retailers.FindAsync(id);
            return retailer is null ? Results.NotFound() : Results.Ok(retailer);
        }).WithSummary("Get retailer by ID");

        group.MapPost("/", async (CreateRetailerRequest req, CatalogDbContext db) =>
        {
            var retailer = new Retailer
            {
                Name = req.Name,
                Email = req.ContactEmail,
                Region = req.Region
            };
            db.Retailers.Add(retailer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/retailers/{retailer.Id}", retailer);
        }).RequireAuthorization().WithSummary("Create a new retailer");

        group.MapPut("/{id:guid}", async (Guid id, UpdateRetailerRequest req, CatalogDbContext db) =>
        {
            var retailer = await db.Retailers.FindAsync(id);
            if (retailer is null) return Results.NotFound();
            retailer.Name = req.Name;
            retailer.Email = req.ContactEmail;
            retailer.Region = req.Region;
            await db.SaveChangesAsync();
            return Results.Ok(retailer);
        }).RequireAuthorization().WithSummary("Update a retailer");

        group.MapDelete("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var retailer = await db.Retailers.FindAsync(id);
            if (retailer is null) return Results.NotFound();
            db.Retailers.Remove(retailer);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization().WithSummary("Delete a retailer");
    }

    public record CreateRetailerRequest(string Name, string ContactEmail, string Region);
    public record UpdateRetailerRequest(string Name, string ContactEmail, string Region);
}