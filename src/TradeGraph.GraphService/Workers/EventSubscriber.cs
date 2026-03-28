using Neo4j.Driver;
using System.Text.Json;
using StackExchange.Redis;
using TradeGraph.GraphService.Graph;
using TradeGraph.Shared.Events;
using TradeGraph.Shared.Models;
using TradeGraph.GraphService.Data;

namespace TradeGraph.GraphService.Workers;

public class EventSubscriber(
    IConnectionMultiplexer redis,
    IDriver driver,
    Neo4jRepository repo,
    ImpactAnalyzer impactAnalyzer,
    ILogger<EventSubscriber> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var sub = redis.GetSubscriber();

        await sub.SubscribeAsync(RedisChannel.Literal("supplier.updated"), async (_, message) =>
        {
            try {
                var ev = JsonSerializer.Deserialize<SupplierUpdatedEvent>((string)message!, JsonOpts);
                if (ev != null) await repo.MergeSupplierAsync(ev.Id, ev.Name, ev.IsActive);
            } catch (Exception ex) { logger.LogError(ex, "Failed syncing supplier"); }
        });

        await sub.SubscribeAsync(RedisChannel.Literal("product.updated"), async (_, message) =>
        {
            try {
                var ev = JsonSerializer.Deserialize<ProductUpdatedEvent>((string)message!, JsonOpts);
                if (ev != null) {
                    await repo.MergeProductAsync(ev.Id, ev.Name, (double)ev.Price);
                    if (ev.SupplierId.HasValue) await repo.LinkProductToSupplierAsync(ev.Id, ev.SupplierId.Value);
                }
            } catch (Exception ex) { logger.LogError(ex, "Failed syncing product"); }
        });

        await sub.SubscribeAsync(RedisChannel.Literal("price.changed"), async (_, message) =>
        {
            try
            {
                var ev = JsonSerializer.Deserialize<PriceChangedEvent>((string)message!, JsonOpts);
                if (ev is null) return;

                logger.LogInformation("Received price change for {ProductName}. Triggering native graph analysis...", ev.ProductName);

                // Use Neo4j to find the Supplier of this product
                Guid? supplierId = null;
                await using var session = driver.AsyncSession();
                var query = "MATCH (s:Supplier)-[:PRODUCES]->(p:Product {id: $pId}) RETURN s.id AS sId LIMIT 1";
                
                await session.ExecuteReadAsync(async tx =>
                {
                    var cursor = await tx.RunAsync(query, new { pId = ev.ProductId.ToString() });
                    if (await cursor.FetchAsync())
                    {
                        supplierId = Guid.Parse(cursor.Current["sId"].As<string>());
                    }
                });

                if (supplierId.HasValue)
                {
                    var percentChange = (double)((ev.NewPrice - ev.OldPrice) / ev.OldPrice) * 100;
                    var (impacted, severity) = await impactAnalyzer.AnalyzeAsync(supplierId.Value, percentChange, stoppingToken);

                    if (severity > 50)
                    {
                        // In the Neo4j rewrite, we don't sync Alerts to Postgres in the GraphService.
                        // We immediately broadcast the incident so NotificationWorker can handle it.
                        var alertId = Guid.NewGuid();
                        var alertTitle = $"High Impact Price Change: {ev.ProductName}";
                        var alertMessage = $"Price changed by {percentChange:F1}%. This affects {impacted.Count} downstream products with a severity score of {severity:F1}.";
                        var alertSeverity = severity > 80 ? AlertSeverity.Critical : AlertSeverity.High;

                        logger.LogWarning("Graph traversal determined severity {Severity} for incident {Id}", alertSeverity, alertId);
                        
                        var alertEvent = new AlertCreatedEvent(alertId, alertTitle, alertMessage, alertSeverity.ToString(), "Global", DateTime.UtcNow);
                        await sub.PublishAsync(RedisChannel.Literal("alert.created"), JsonSerializer.Serialize(alertEvent, JsonOpts));
                    }
                }
                else
                {
                    logger.LogWarning("No supplier found in Neo4j for Product {Id}", ev.ProductId);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing price change event");
            }
        });

        logger.LogInformation("Neo4j Graph Event Subscriber started.");
    }
}
