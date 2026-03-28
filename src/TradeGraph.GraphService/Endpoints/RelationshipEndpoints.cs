using Neo4j.Driver;
using TradeGraph.GraphService.Data;

namespace TradeGraph.GraphService.Endpoints;

public static class RelationshipEndpoints
{
    public static void MapRelationshipEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/graph/relationships").WithTags("Supply Relationships");

        group.MapPost("/", async (CreateRelationshipRequest req, Neo4jRepository repo) =>
        {
            await repo.MergeRelationshipAsync(req.FromSupplierId, req.ToSupplierId, req.ProductId, req.Strength);
            return Results.Ok(new { message = "Relationship merged successfully" });
        }).WithSummary("Create or update a supply relationship edge");

        // Simple lookup endpoint natively querying cypher
        group.MapGet("/{supplierId:guid}", async (Guid supplierId, IDriver driver) =>
        {
            var results = new List<object>();
            await using var session = driver.AsyncSession();
            await session.ExecuteReadAsync(async tx =>
            {
                var cursor = await tx.RunAsync(
                    "MATCH (s:Supplier {id: $id})-[r:SUPPLIES]->(down:Supplier) " +
                    "RETURN down.id AS toId, r.productId AS productId, r.strength AS strength",
                    new { id = supplierId.ToString() });

                while (await cursor.FetchAsync())
                {
                    results.Add(new
                    {
                        ToSupplierId = cursor.Current["toId"].As<string>(),
                        ProductId = cursor.Current["productId"].As<string>(),
                        Strength = cursor.Current["strength"].As<int>()
                    });
                }
            });
            return Results.Ok(results);
        }).WithSummary("Get downstream relationships for a supplier");
    }
}

public record CreateRelationshipRequest(Guid FromSupplierId, Guid ToSupplierId, Guid? ProductId, int Strength);
