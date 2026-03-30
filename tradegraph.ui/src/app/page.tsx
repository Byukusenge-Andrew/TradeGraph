'use client';
import { useEffect, useState } from 'react';
import { getSuppliers, getProducts, getRetailers, getPriceHistory, type PriceHistory } from '@/lib/api';

interface Stats {
  suppliers: number;
  products: number;
  retailers: number;
  lowStock: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ suppliers: 0, products: 0, retailers: 0, lowStock: 0 });
  const [recentHistory, setRecentHistory] = useState<(PriceHistory & { productName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, p, r] = await Promise.all([
          getSuppliers(1, 200),
          getProducts(1, 200),
          getRetailers(1, 200),
        ]);
        const lowStock = p.items.filter(x => x.stockLevel < 10).length;
        setStats({ suppliers: s.total, products: p.total, retailers: r.total, lowStock });

        // Get price history from first few products
        const histories: (PriceHistory & { productName?: string })[] = [];
        for (const prod of p.items.slice(0, 5)) {
          const h = await getPriceHistory(prod.id);
          histories.push(...h.slice(0, 3).map(x => ({ ...x, productName: prod.name })));
        }
        histories.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
        setRecentHistory(histories.slice(0, 8));
      } catch { /* API not ready yet */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Suppliers', value: stats.suppliers, icon: '🏭', color: 'var(--cyan)', glow: 'rgba(0,212,255,0.1)' },
    { label: 'Total Products', value: stats.products, icon: '📦', color: 'var(--violet)', glow: 'rgba(168,85,247,0.1)' },
    { label: 'Total Retailers', value: stats.retailers, icon: '🏪', color: 'var(--green)', glow: 'rgba(74,222,128,0.1)' },
    { label: 'Low Stock Alerts', value: stats.lowStock, icon: '⚠️', color: 'var(--red)', glow: 'rgba(248,113,113,0.1)' },
  ];

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Supply Chain Dashboard</h1>
          <p className="page-subtitle">Real-time overview of your wholesale network</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {statCards.map(c => (
          <div key={c.label} className="stat-card" style={{ borderColor: loading ? 'var(--border)' : `rgba(${c.glow}, 0.5)` }}>
            <div className="stat-card-icon">{c.icon}</div>
            <div className="stat-card-value" style={{ color: c.color }}>
              {loading ? '—' : c.value}
            </div>
            <div className="stat-card-label">{c.label}</div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${c.color}, transparent)`,
              opacity: 0.3,
            }} />
          </div>
        ))}
      </div>

      {/* Two column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Price Changes */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            📈 Recent Price Changes
          </div>
          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : recentHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              No price changes yet
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map(h => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{h.productName}</td>
                    <td style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>${h.oldPrice.toFixed(2)}</td>
                    <td style={{ color: h.newPrice > h.oldPrice ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                      ${h.newPrice.toFixed(2)}
                      <span style={{ fontSize: 10, marginLeft: 4 }}>
                        {h.newPrice > h.oldPrice ? '▲' : '▼'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{new Date(h.changedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Architecture Overview */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            🏗 Architecture
          </div>
          {[
            { name: 'API Gateway', port: ':5000', status: 'YARP Proxy', color: 'var(--cyan)' },
            { name: 'Catalog Service', port: ':5001', status: 'PostgreSQL', color: 'var(--cyan)' },
            { name: 'Graph Service', port: ':5002', status: 'Neo4j', color: 'var(--violet)' },
            { name: 'Notification Worker', port: 'bg', status: 'Valkey Sub', color: 'var(--green)' },
          ].map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-gray">{s.port}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.status}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--cyan-dim)', borderRadius: 8, border: '1px solid rgba(0,212,255,0.1)' }}>
            <div style={{ fontSize: 11, color: 'var(--cyan)' }}>
              📡 Event bus: Valkey Cloud (Redis Pub/Sub)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              price.changed · supplier.updated · product.updated · alert.created · stock.low
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
