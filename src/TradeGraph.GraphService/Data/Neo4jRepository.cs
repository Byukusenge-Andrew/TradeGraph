using Neo4j.Driver;
using TradeGraph.GraphService.Graph;

namespace TradeGraph.GraphService.Data;

public class Neo4jRepository(IDriver driver, ILogger<Neo4jRepository> logger) : IAsyncDisposable
{
    public async Task MergeSupplierAsync(Guid id, string name, bool isActive)
    {
        await using var session = driver.AsyncSession();
        await session.ExecuteWriteAsync(async tx =>
        {
            var query = "MERGE (s:Supplier {id: $id}) SET s.name = $name, s.isActive = $isActive";
            await tx.RunAsync(query, new { id = id.ToString(), name, isActive });
        });
        logger.LogDebug("Merged Supplier {Id} into Neo4j", id);
    }

    public async Task MergeProductAsync(Guid id, string name, double price)
    {
        await using var session = driver.AsyncSession();
        await session.ExecuteWriteAsync(async tx =>
        {
            var query = "MERGE (p:Product {id: $id}) SET p.name = $name, p.price = $price";
            await tx.RunAsync(query, new { id = id.ToString(), name, price });
        });
        logger.LogDebug("Merged Product {Id} into Neo4j", id);
    }

    public async Task MergeRelationshipAsync(Guid fromSupplier, Guid toSupplier, Guid? productId, int strength)
    {
        await using var session = driver.AsyncSession();
        await session.ExecuteWriteAsync(async tx =>
        {
            var productProp = productId.HasValue ? productId.Value.ToString() : "";
            var query = @"
                MATCH (from:Supplier {id: $fromId}), (to:Supplier {id: $toId})
                MERGE (from)-[r:SUPPLIES {productId: $productId}]->(to)
                SET r.strength = $strength";
            await tx.RunAsync(query, new { fromId = fromSupplier.ToString(), toId = toSupplier.ToString(), productId = productProp, strength });
        });
        logger.LogDebug("Merged Relationship from {From} to {To} into Neo4j", fromSupplier, toSupplier);
    }

    public async Task LinkProductToSupplierAsync(Guid productId, Guid supplierId)
    {
        await using var session = driver.AsyncSession();
        await session.ExecuteWriteAsync(async tx =>
        {
            var query = @"
                MATCH (p:Product {id: $pId}), (s:Supplier {id: $sId})
                MERGE (s)-[:PRODUCES]->(p)";
            await tx.RunAsync(query, new { pId = productId.ToString(), sId = supplierId.ToString() });
        });
        logger.LogDebug("Linked Product {ProductId} to Supplier {SupplierId}", productId, supplierId);
    }

    public async ValueTask DisposeAsync()
    {
        await driver.DisposeAsync();
    }
}
