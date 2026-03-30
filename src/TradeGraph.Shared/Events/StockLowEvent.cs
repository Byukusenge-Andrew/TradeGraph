namespace TradeGraph.Shared.Events;


public record StockLowEvent(
    Guid ProductId,
    string  ProductName,
    int CurrentStock,
    Guid? supplierId
);