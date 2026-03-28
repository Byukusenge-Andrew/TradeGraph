namespace TradeGraph.Shared.Events;

public record PriceChangedEvent(
    Guid ProductId,
    string ProductName,
    decimal OldPrice,
    decimal NewPrice,
    string ChangedBy,
    DateTime Timestamp);
