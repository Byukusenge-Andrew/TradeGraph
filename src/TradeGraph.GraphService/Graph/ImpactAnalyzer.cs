using Neo4j.Driver;

namespace TradeGraph.GraphService.Graph;

public record ImpactedProduct(Guid ProductId, string ProductName, double RipplePercentage, int HopsFromSource);

public class ImpactAnalyzer(IDriver driver, ILogger<ImpactAnalyzer> logger)
{
    /// <summary>
    /// Executes a Cypher query bounding traversal to 5 hops downstream starting from the supplier.
    /// It calculates exact ripple propagation multiplicatively along edges inline in the query!
    /// </summary>
    public async Task<(List<ImpactedProduct> Products, double SeverityScore)> AnalyzeAsync(
        Guid supplierId, double priceChangePercent, CancellationToken ct = default)
    {
        var affected = new List<ImpactedProduct>();
        
        await using var session = driver.AsyncSession();
        
        // Match up to 5 levels of SUPPLIES relationships leading to a downstream supplier, 
        // then match the products produced by that downstream supplier.
        var query = @"
            MATCH p = (start:Supplier {id: $supplierId})-[rels:SUPPLIES*1..5]->(downstream:Supplier)
            MATCH (downstream)-[:PRODUCES]->(prod:Product)
            WITH prod, relationships(p) as rels, length(p) as hops
            WITH prod, hops, reduce(acc = 1.0, r IN rels | acc * (r.strength / 5.0) * 0.8) AS factor
            RETURN prod.id AS productId, prod.name as productName, factor, hops
        ";
        
        try
        {
            await session.ExecuteReadAsync(async tx =>
            {
                var cursor = await tx.RunAsync(query, new { supplierId = supplierId.ToString() });
                while (await cursor.FetchAsync())
                {
                    var id = Guid.Parse(cursor.Current["productId"].As<string>());
                    var name = cursor.Current["productName"].As<string>();
                    var factor = cursor.Current["factor"].As<double>();
                    var hops = cursor.Current["hops"].As<int>();
                    
                    var ripple = priceChangePercent * factor;
                    affected.Add(new ImpactedProduct(id, name, Math.Round(ripple, 2), hops));
                }
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to run Cypher impact analysis");
        }

        var severity = affected.Count == 0 ? 0.0
            : Math.Min(100.0, affected.Count * 5 + affected.Average(p => Math.Abs(p.RipplePercentage)));

        logger.LogInformation(
            "Neo4j Impact analysis for supplier {Id}: {Count} affected products, severity {Score:F1}",
            supplierId, affected.Count, severity);

        return (affected, Math.Round(severity, 1));
    }
}
