using System.Text.Json;
using StackExchange.Redis;
using TradeGraph.Shared.Events;

namespace TradeGraph.NotificationWorker;

public class Worker(
    IConnectionMultiplexer redis,
    ILogger<Worker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Notification Worker running at: {time}", DateTimeOffset.Now);

        var sub = redis.GetSubscriber();

        await sub.SubscribeAsync(RedisChannel.Literal("alert.created"), (channel, message) =>
        {
            try
            {
                var @event = JsonSerializer.Deserialize<AlertCreatedEvent>((string)message!, JsonOpts);
                if (@event is null) return;

                // Here we would normally query the database for Retailers in the affected Region
                // and send them an email via SMTP (e.g., MailKit), SMS (e.g., Twilio), etc.
                // For this demo, we will just log heavily to simulate sending notifications.

                logger.LogWarning(
                    "=========================================\n" +
                    "ALERT NOTIFICATION DISPATCHED\n" +
                    "ID: {AlertId}\n" +
                    "Severity: {Severity}\n" +
                    "Title: {Title}\n" +
                    "Message: {Message}\n" +
                    "Region: {Region}\n" +
                    "=========================================",
                    @event.AlertId, @event.Severity, @event.Title, @event.Message, @event.Region);

                // Simulate processing time
                Task.Delay(500, stoppingToken).Wait(stoppingToken);
                
                logger.LogInformation("Successfully sent mock notifications for alert {AlertId}", @event.AlertId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing alert message");
            }
        });

        await sub.SubscribeAsync(RedisChannel.Literal("stock.low"), async (_, message) =>{
            var ev = JsonSerializer.Deserialize<StockLowEvent>((string)
            message!, JsonOpts);
            if(ev is null) return;

            logger.LogWarning(
                "[STOCK LOW] Product '{Name}' (ID: {Id}) has only {Count} units remaining!",
                ev.ProductName, ev.ProductId, ev.CurrentStock);
           await Task.CompletedTask;
        });

        // Wait indefinitely
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
