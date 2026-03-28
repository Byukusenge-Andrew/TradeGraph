using Microsoft.EntityFrameworkCore;
using TradeGraph.CatalogService.Data;
using TradeGraph.CatalogService.Services;
using TradeGraph.Shared.Events;
using TradeGraph.Shared.Interfaces;

namespace TradeGraph.CatalogService.Endpoints;

public static class PriceEndpoints
{
    public static void MapPriceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/products").WithTags("Pricing");

        group.MapPut("/{id:guid}/price", async (Guid id, UpdatePriceRequest req, CatalogDbContext db, IEventBus bus) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product is null) return Results.NotFound();

            var oldPrice = product.Price;

            db.PriceHistories.Add(new()
            {
                ProductId = id,
                OldPrice = oldPrice,
                NewPrice = req.NewPrice,
                ChangedBy = req.ChangedBy ?? "api"
            });

            product.Price = req.NewPrice;
            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Publish event for Graph Service to react
            await bus.PublishAsync("price.changed", new PriceChangedEvent(
                id, product.Name, oldPrice, req.NewPrice,
                req.ChangedBy ?? "api", DateTime.UtcNow));

            return Results.Ok(new
            {
                ProductId = id,
                OldPrice = oldPrice,
                NewPrice = req.NewPrice,
                ChangedAt = DateTime.UtcNow
            });
        }).WithSummary("Update product price and publish change event");
    }
}

public record UpdatePriceRequest(decimal NewPrice, string? ChangedBy);
