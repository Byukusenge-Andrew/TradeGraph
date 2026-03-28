namespace TradeGraph.Shared.Models;

public class PriceHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public string ChangedBy { get; set; } = "system";
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
