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
        }).RequireAuthorization().WithSummary("Create or update a supply relationship edge");

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

        //get all connections
        group.MapGet("/conn/{supplierId:guid}", async (Guid supplierId, IDriver driver) =>
        {
            await using var session = driver.AsyncSession();
            var result = await session.RunAsync(
                @"MATCH (s:Supplier {id: $id})-[r:SUPPLIES]->(t)
                RETURN t.id AS targetId, t.name AS targetName, labels(t)[0] AS targetType, r.factor AS factor",
                new { id = supplierId.ToString() });

            var edges = new List<object>();
            await result.ForEachAsync(r => edges.Add(new
            {
                targetId   = r["targetId"].As<string>(),
                targetName = r["targetName"].As<string>(),
                targetType = r["targetType"].As<string>(),
                factor     = r["factor"].As<double>()
            }));
            return Results.Ok(edges);
        }).WithSummary("Get all relationships for a supplier");

        group.MapGet("/nodes", async (IDriver driver) =>
        {
            await using var session = driver.AsyncSession();
            var result = await session.RunAsync(
                "MATCH (n) RETURN n.id AS id, n.name AS name, labels(n)[0] AS type");

            var nodes = new List<object>();
            await result.ForEachAsync(r => nodes.Add(new
            {
                id   = r["id"].As<string>(),
                name = r["name"].As<string>(),
                type = r["type"].As<string>()
            }));
            return Results.Ok(nodes);
        }).WithSummary("Get all graph nodes");

        // DELETE a relationship between two nodes
        group.MapDelete("/{fromId:guid}/{toId:guid}", async (Guid fromId, Guid toId, IDriver driver) =>
        {
            await using var session = driver.AsyncSession();
            await session.RunAsync(
                @"MATCH (a {id: $from})-[r:SUPPLIES]->(b {id: $to})
                DELETE r",
                new { from = fromId.ToString(), to = toId.ToString() });
            return Results.NoContent();
        }).RequireAuthorization().WithSummary("Remove a supply chain relationship");
    }
}

public record CreateRelationshipRequest(Guid FromSupplierId, Guid ToSupplierId, Guid? ProductId, int Strength);
