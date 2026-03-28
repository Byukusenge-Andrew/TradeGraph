namespace TradeGraph.Shared.Models;

public class SupplyRelationship
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FromSupplierId { get; set; }
    public Supplier? FromSupplier { get; set; }
    public Guid ToSupplierId { get; set; }
    public Supplier? ToSupplier { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>Relationship strength 1-5 (affects price ripple propagation)</summary>
    public int Strength { get; set; } = 3;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
