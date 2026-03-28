namespace TradeGraph.Shared.Events;

public record SupplyDisruptionEvent(
    Guid SupplierId,
    string SupplierName,
    List<Guid> AffectedProductIds,
    string Reason,
    DateTime Timestamp);
