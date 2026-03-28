namespace TradeGraph.Shared.Events;

public record ProductUpdatedEvent(Guid Id, string Name, decimal Price, Guid? SupplierId);
