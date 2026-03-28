namespace TradeGraph.Shared.Interfaces;

public interface IEventBus
{
    Task PublishAsync<T>(string channel, T @event, CancellationToken ct = default) where T : class;
    Task SubscribeAsync<T>(string channel, Func<T, Task> handler, CancellationToken ct = default) where T : class;
}
