using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using TradeGraph.CatalogService.Data;
using TradeGraph.Shared.Events;
using TradeGraph.Shared.Interfaces;
using TradeGraph.Shared.Protos;

namespace TradeGraph.CatalogService.Services;

public class CatalogGrpcService(
    CatalogDbContext db,
    IEventBus eventBus,
    ILogger<CatalogGrpcService> logger)
    : CatalogGrpc.CatalogGrpcBase
{
    public override async Task<ProductResponse> GetProduct(GetProductRequest request, ServerCallContext ctx)
    {
        if (!Guid.TryParse(request.Id, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid product ID"));

        var product = await db.Products.Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, ctx.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Product {id} not found"));

        return ToResponse(product);
    }

    public override async Task<ListProductsResponse> ListProducts(ListProductsRequest request, ServerCallContext ctx)
    {
        var page = Math.Max(1, request.Page);
        var size = Math.Clamp(request.PageSize, 1, 100);

        var total = await db.Products.CountAsync(ctx.CancellationToken);
        var products = await db.Products
            .Include(p => p.Supplier)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ctx.CancellationToken);

        var response = new ListProductsResponse { Total = total };
        response.Products.AddRange(products.Select(ToResponse));
        return response;
    }

    public override async Task<UpdatePriceResponse> UpdatePrice(UpdatePriceRequest request, ServerCallContext ctx)
    {
        if (!Guid.TryParse(request.ProductId, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid product ID"));

        var product = await db.Products.FindAsync([id], ctx.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Product {id} not found"));

        var oldPrice = product.Price;
        var newPrice = (decimal)request.NewPrice;

        db.PriceHistories.Add(new()
        {
            ProductId = product.Id,
            OldPrice = oldPrice,
            NewPrice = newPrice,
            ChangedBy = request.ChangedBy
        });

        product.Price = newPrice;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ctx.CancellationToken);

        await eventBus.PublishAsync("price.changed", new PriceChangedEvent(
            product.Id, product.Name, oldPrice, newPrice, request.ChangedBy, DateTime.UtcNow));

        logger.LogInformation("Price updated for product {Id}: {Old} -> {New}", id, oldPrice, newPrice);
        return new UpdatePriceResponse { Success = true, Message = $"Price updated from {oldPrice:C} to {newPrice:C}" };
    }

    public override async Task<UpdateStockResponse> UpdateStock(UpdateStockRequest request, ServerCallContext ctx)
    {
        if (!Guid.TryParse(request.ProductId, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid product ID"));

        var product = await db.Products.FindAsync([id], ctx.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Product {id} not found"));

        product.StockLevel = request.NewStockLevel;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ctx.CancellationToken);

        return new UpdateStockResponse { Success = true, CurrentStock = product.StockLevel };
    }

    private static ProductResponse ToResponse(Shared.Models.Product p) => new()
    {
        Id = p.Id.ToString(),
        Name = p.Name,
        Sku = p.Sku,
        Price = (double)p.Price,
        StockLevel = p.StockLevel,
        SupplierId = p.SupplierId?.ToString() ?? string.Empty,
        CreatedAt = p.CreatedAt.ToString("O")
    };
}
