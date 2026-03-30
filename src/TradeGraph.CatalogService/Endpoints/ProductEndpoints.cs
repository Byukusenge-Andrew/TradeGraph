using Microsoft.EntityFrameworkCore;
using TradeGraph.CatalogService.Data;
using TradeGraph.Shared.Models;
using TradeGraph.Shared.Events;
using TradeGraph.Shared.Interfaces;

namespace TradeGraph.CatalogService.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/products").WithTags("Products");

        group.MapGet("/", async (CatalogDbContext db, int page = 1, int pageSize = 20) =>
        {
            var total = await db.Products.CountAsync();
            var items = await db.Products
                .Include(p => p.Supplier)
                .OrderBy(p => p.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id, p.Name, p.Sku, p.Price, p.StockLevel,
                    Supplier = p.Supplier == null ? null : new { p.Supplier.Id, p.Supplier.Name, p.Supplier.Region },
                    p.CreatedAt, p.UpdatedAt
                })
                .ToListAsync();

            return Results.Ok(new { total, page, pageSize, items });
        }).WithSummary("List all products");

        group.MapGet("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var product = await db.Products.Include(p => p.Supplier).FirstOrDefaultAsync(p => p.Id == id);
            return product is null ? Results.NotFound() : Results.Ok(product);
        }).WithSummary("Get product by ID");

        group.MapPost("/", async (CreateProductRequest req, CatalogDbContext db, IEventBus bus) =>
        {
            if (await db.Products.AnyAsync(p => p.Sku == req.Sku))
                return Results.Conflict($"SKU '{req.Sku}' already exists");

            var product = new Product
            {
                Name = req.Name,
                Sku = req.Sku,
                Price = req.Price,
                StockLevel = req.StockLevel,
                SupplierId = req.SupplierId
            };

            db.Products.Add(product);
            await db.SaveChangesAsync();
            
            await bus.PublishAsync("product.updated", new ProductUpdatedEvent(product.Id, product.Name, product.Price, product.SupplierId));
            
            return Results.Created($"/api/products/{product.Id}", product);
        }).RequireAuthorization().WithSummary("Create a new product");

        group.MapPut("/{id:guid}", async (Guid id, UpdateProductRequest req, CatalogDbContext db, IEventBus bus) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product is null) return Results.NotFound();

            product.Name = req.Name;
            product.StockLevel = req.StockLevel;
            product.SupplierId = req.SupplierId;
            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            
            await bus.PublishAsync("product.updated", new ProductUpdatedEvent(product.Id, product.Name, product.Price, product.SupplierId));

            if (product.StockLevel < 10)
                await bus.PublishAsync("stock.low", new StockLowEvent(product.Id, product.Name, product.StockLevel, product.SupplierId));
            
            return Results.Ok(product);
        }).RequireAuthorization().WithSummary("Update a product");

        group.MapDelete("/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product is null) return Results.NotFound();
            db.Products.Remove(product);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization().WithSummary("Delete a product");



        group.MapGet("/{id:guid}/price-history", async (Guid id, CatalogDbContext db) =>
        {
            var history = await db.PriceHistories
                .Where(ph => ph.ProductId == id)
                .OrderByDescending(ph => ph.ChangedAt)
                .Take(50)
                .ToListAsync();
            return Results.Ok(history);
        }).WithSummary("Get price history for a product");
    }
}

public record CreateProductRequest(string Name, string Sku, decimal Price, int StockLevel, Guid? SupplierId);
public record UpdateProductRequest(string Name, int StockLevel, Guid? SupplierId);
