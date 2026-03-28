using Microsoft.EntityFrameworkCore;
using TradeGraph.CatalogService.Data;
using TradeGraph.Shared.Models;
using TradeGraph.Shared.Events;
using TradeGraph.Shared.Interfaces;

namespace TradeGraph.CatalogService.Endpoints;

public static class SupplierEndpoints
{
    public static void MapSupplierEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/suppliers").WithTags("Suppliers");

        group.MapGet("/", async (CatalogDbContext db) =>
        {
            var suppliers = await db.Suppliers
                .Select(s => new { s.Id, s.Name, s.ContactEmail, s.Region, s.IsActive, s.CreatedAt,
                    ProductCount = s.Products.Count })
                .OrderBy(s => s.Name)
                .ToListAsync();
            return Results.Ok(suppliers);
        }).WithSummary("List all suppliers");

        group.MapGet("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var supplier = await db.Suppliers.Include(s => s.Products)
                .FirstOrDefaultAsync(s => s.Id == id);
            return supplier is null ? Results.NotFound() : Results.Ok(supplier);
        }).WithSummary("Get supplier by ID");

        group.MapPost("/", async (CreateSupplierRequest req, CatalogDbContext db, IEventBus bus) =>
        {
            var supplier = new Supplier
            {
                Name = req.Name,
                ContactEmail = req.ContactEmail,
                Region = req.Region
            };
            db.Suppliers.Add(supplier);
            await db.SaveChangesAsync();
            
            await bus.PublishAsync("supplier.updated", new SupplierUpdatedEvent(supplier.Id, supplier.Name, supplier.IsActive));
            
            return Results.Created($"/api/suppliers/{supplier.Id}", supplier);
        }).WithSummary("Create a new supplier");

        group.MapPut("/{id:guid}", async (Guid id, UpdateSupplierRequest req, CatalogDbContext db, IEventBus bus) =>
        {
            var supplier = await db.Suppliers.FindAsync(id);
            if (supplier is null) return Results.NotFound();
            supplier.Name = req.Name;
            supplier.ContactEmail = req.ContactEmail;
            supplier.Region = req.Region;
            supplier.IsActive = req.IsActive;
            await db.SaveChangesAsync();
            
            await bus.PublishAsync("supplier.updated", new SupplierUpdatedEvent(supplier.Id, supplier.Name, supplier.IsActive));
            
            return Results.Ok(supplier);
        }).WithSummary("Update a supplier");

        group.MapDelete("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var supplier = await db.Suppliers.FindAsync(id);
            if (supplier is null) return Results.NotFound();
            db.Suppliers.Remove(supplier);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithSummary("Delete a supplier");
    }
}

public record CreateSupplierRequest(string Name, string ContactEmail, string Region);
public record UpdateSupplierRequest(string Name, string ContactEmail, string Region, bool IsActive);
