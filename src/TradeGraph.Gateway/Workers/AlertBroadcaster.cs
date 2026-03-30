using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;
using System.Text.Json;
using TradeGraph.Gateway.Hubs;

namespace TradeGraph.Gateway.Workers;

public class AlertBroadcaster(
    IConnectionMultiplexer redis,
    IHubContext<AlertHub> hub,
    ILogger<AlertBroadcaster> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var sub = redis.GetSubscriber();
        
        await sub.SubscribeAsync(new RedisChannel("stock.low", RedisChannel.PatternMode.Literal), async (_, message) =>
        {
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object>>((string)message!);
                if (dict != null)
                {
                    logger.LogInformation("Broadcasting stock.low alert via SignalR => {Product}", dict["ProductName"]);
                    await hub.Clients.All.SendAsync("AlertReceived", new { type = "stock_low", data = dict }, stoppingToken);
                }
            }
            catch (Exception ex) { logger.LogError(ex, "Failed to broadcast low stock alert"); }
        });

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
