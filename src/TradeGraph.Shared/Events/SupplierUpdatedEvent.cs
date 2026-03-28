namespace TradeGraph.Shared.Events;

public record SupplierUpdatedEvent(Guid Id, string Name, bool IsActive);
