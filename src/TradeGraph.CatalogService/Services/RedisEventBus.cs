using System.Text.Json;
using StackExchange.Redis;
using TradeGraph.Shared.Interfaces;

namespace TradeGraph.CatalogService.Services;

public class RedisEventBus(IConnectionMultiplexer redis, ILogger<RedisEventBus> logger) : IEventBus
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public async Task PublishAsync<T>(string channel, T @event, CancellationToken ct = default) where T : class
    {
        var sub = redis.GetSubscriber();
        var json = JsonSerializer.Serialize(@event, JsonOpts);
        await sub.PublishAsync(RedisChannel.Literal(channel), json);
        logger.LogInformation("Published {EventType} to channel '{Channel}'", typeof(T).Name, channel);
    }

    public async Task SubscribeAsync<T>(string channel, Func<T, Task> handler, CancellationToken ct = default) where T : class
    {
        var sub = redis.GetSubscriber();
        await sub.SubscribeAsync(RedisChannel.Literal(channel), async (_, message) =>
        {
            try
            {
                var @event = JsonSerializer.Deserialize<T>((string)message!, JsonOpts);
                if (@event is not null) await handler(@event);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error handling message on channel '{Channel}'", channel);
            }
        });
    }
}
