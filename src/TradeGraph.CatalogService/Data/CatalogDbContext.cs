using Microsoft.EntityFrameworkCore;
using TradeGraph.Shared.Models;

namespace TradeGraph.CatalogService.Data;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PriceHistory> PriceHistories => Set<PriceHistory>();
    public DbSet<Retailer> Retailers => Set<Retailer>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Product>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Price).HasPrecision(12, 2);
            e.HasIndex(p => p.Sku).IsUnique();
            e.HasOne(p => p.Supplier)
             .WithMany(s => s.Products)
             .HasForeignKey(p => p.SupplierId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        model.Entity<Supplier>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.ContactEmail);
            e.Ignore(s => s.IncomingRelationships);
            e.Ignore(s => s.OutgoingRelationships);
        });

        model.Entity<PriceHistory>(e =>
        {
            e.HasKey(ph => ph.Id);
            e.Property(ph => ph.OldPrice).HasPrecision(12, 2);
            e.Property(ph => ph.NewPrice).HasPrecision(12, 2);
            e.HasOne(ph => ph.Product)
             .WithMany(p => p.PriceHistories)
             .HasForeignKey(ph => ph.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<Retailer>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.Region);
        });
    }
}
