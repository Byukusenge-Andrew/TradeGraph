namespace TradeGraph.Shared.Models;

public class Supplier
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Product> Products { get; set; } = [];
    public ICollection<SupplyRelationship> OutgoingRelationships { get; set; } = [];
    public ICollection<SupplyRelationship> IncomingRelationships { get; set; } = [];
}
