namespace TradeGraph.Shared.Events;

public record AlertCreatedEvent(
    Guid AlertId,
    string Title,
    string Message,
    string Severity,
    string Region,
    DateTime Timestamp);
