using Grpc.Core;
using Neo4j.Driver;
using TradeGraph.GraphService.Graph;
using TradeGraph.Shared.Protos;

namespace TradeGraph.GraphService.Services;

public class GraphGrpcService(
    ImpactAnalyzer analyzer,
    IDriver driver,
    ILogger<GraphGrpcService> logger)
    : GraphGrpc.GraphGrpcBase
{
    public override async Task<ImpactResponse> AnalyzeImpact(AnalyzeImpactRequest request, ServerCallContext ctx)
    {
        if (!Guid.TryParse(request.SupplierId, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid supplier ID"));

        var (products, severity) = await analyzer.AnalyzeAsync(id, request.PriceChangePercentage, ctx.CancellationToken);

        var response = new ImpactResponse
        {
            SupplierId = id.ToString(),
            SeverityScore = severity,
            TotalAffected = products.Count,
            AnalysisTimestamp = DateTime.UtcNow.ToString("O")
        };

        foreach (var p in products)
        {
            response.AffectedProducts.Add(new AffectedProduct
            {
                ProductId = p.ProductId.ToString(),
                ProductName = p.ProductName,
                RipplePercentage = p.RipplePercentage,
                HopsFromSource = p.HopsFromSource
            });
        }

        return response;
    }

    public override async Task<HealthResponse> GetSupplyChainHealth(HealthRequest request, ServerCallContext ctx)
    {
        await using var session = driver.AsyncSession();
        
        int totalNodes = 0;
        int activeNodes = 0;
        int totalEdges = 0;

        await session.ExecuteReadAsync(async tx =>
        {
            var nodeCursor = await tx.RunAsync("MATCH (s:Supplier) RETURN count(s) AS total, sum(CASE s.isActive WHEN true THEN 1 ELSE 0 END) AS active");
            if (await nodeCursor.FetchAsync())
            {
                totalNodes = nodeCursor.Current["total"].As<int>();
                activeNodes = nodeCursor.Current["active"].As<int>();
            }

            var edgeCursor = await tx.RunAsync("MATCH ()-[r:SUPPLIES]->() RETURN count(r) AS edges");
            if (await edgeCursor.FetchAsync())
                totalEdges = edgeCursor.Current["edges"].As<int>();
        });

        return new HealthResponse
        {
            TotalSuppliers = totalNodes,
            ActiveSuppliers = activeNodes,
            TotalRelationships = totalEdges,
            OpenAlerts = 0, // Ignored here
            HealthScore = totalNodes == 0 ? 0 : (double)activeNodes / totalNodes * 100
        };
    }

    public override Task<CreateAlertResponse> CreateAlert(CreateAlertRequest request, ServerCallContext ctx)
    {
        return Task.FromResult(new CreateAlertResponse { AlertId = Guid.NewGuid().ToString(), Success = true });
    }
}
