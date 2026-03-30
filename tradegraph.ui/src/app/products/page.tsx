'use client';
import { useEffect, useState } from 'react';
import { getProducts, getSuppliers, createProduct, updateProduct, deleteProduct, updatePrice, getPriceHistory, type Product, type Supplier, type PriceHistory } from '@/lib/api';
import Modal from '@/components/Modal';
import { useToast } from '@/components/useToast';

const emptyForm = { name: '', sku: '', price: 0, stockLevel: 0, supplierId: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | 'edit' | 'price' | 'history'>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPrice, setNewPrice] = useState('');
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [saving, setSaving] = useState(false);
  const { add, ToastContainer } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getProducts(1, 50), getSuppliers(1, 200)]);
      setProducts(p.items); setTotal(p.total); setSuppliers(s.items);
    } catch { add('error', 'Failed to load products'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal('create'); };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, sku: p.sku, price: p.price, stockLevel: p.stockLevel, supplierId: p.supplierId ?? '' });
    setEditing(p); setModal('edit');
  };
  const openPrice = (p: Product) => { setEditing(p); setNewPrice(p.price.toString()); setModal('price'); };
  const openHistory = async (p: Product) => {
    setEditing(p);
    try { const h = await getPriceHistory(p.id); setHistory(h); } catch { setHistory([]); }
    setModal('history');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await createProduct({ ...form, supplierId: form.supplierId || undefined });
        add('success', `Product "${form.name}" created!`);
      } else if (editing) {
        await updateProduct(editing.id, { name: form.name, stockLevel: form.stockLevel, supplierId: form.supplierId || undefined });
        add('success', `Product "${form.name}" updated!`);
      }
      setModal(null); load();
    } catch (e: unknown) { add('error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handlePriceUpdate = async () => {
    if (!editing) return;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return add('error', 'Invalid price');
    setSaving(true);
    try {
      await updatePrice(editing.id, price);
      add('success', `Price updated! Neo4j cascade triggered 🕸`);
      setModal(null); load();
    } catch (e: unknown) { add('error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try { await deleteProduct(p.id); add('success', 'Product deleted'); load(); }
    catch (e: unknown) { add('error', (e as Error).message); }
  };

  return (
    <div className="animate-fade">
      <ToastContainer />
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{total} products across all suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add Product</button>
      </div>

      <div className="glass">
        {loading ? (
          <div className="empty-state">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            No products yet. Add your first one!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                  <td><span className="badge badge-gray">{p.sku}</span></td>
                  <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>${p.price.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.stockLevel < 10 ? 'badge-red' : p.stockLevel < 50 ? 'badge-cyan' : 'badge-green'}`}>
                      {p.stockLevel < 10 ? '⚠ ' : ''}{p.stockLevel} units
                    </span>
                  </td>
                  <td>{p.supplier ? <span className="badge badge-violet">{p.supplier.name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-violet btn-sm" onClick={() => openPrice(p)}>Price</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openHistory(p)}>History</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Product' : 'Edit Product'} icon="📦" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cold-Rolled Steel" />
          </div>
          <div className="form-group">
            <label className="form-label">SKU</label>
            <input className="form-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. CRS-001" disabled={modal === 'edit'} />
          </div>
          {modal === 'create' && (
            <div className="form-group">
              <label className="form-label">Initial Price ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Stock Level</label>
            <input className="form-input" type="number" value={form.stockLevel} onChange={e => setForm(f => ({ ...f, stockLevel: parseInt(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier (optional)</label>
            <select className="form-input" value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
              <option value="">— None —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Update'}</button>
          </div>
        </Modal>
      )}

      {/* Price Update Modal */}
      {modal === 'price' && editing && (
        <Modal title={`Update Price — ${editing.name}`} icon="💲" onClose={() => setModal(null)}>
          <div style={{ padding: '12px 16px', background: 'var(--cyan-dim)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(0,212,255,0.1)' }}>
            <div style={{ fontSize: 12, color: 'var(--cyan)' }}>
              ⚡ This triggers the Neo4j impact cascade analysis across all downstream suppliers
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Current Price</label>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>${editing.price.toFixed(2)}</div>
          </div>
          <div className="form-group">
            <label className="form-label">New Price ($)</label>
            <input className="form-input" type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-violet" onClick={handlePriceUpdate} disabled={saving}>{saving ? 'Updating...' : 'Update & Trigger Cascade'}</button>
          </div>
        </Modal>
      )}

      {/* Price History Modal */}
      {modal === 'history' && editing && (
        <Modal title={`Price History — ${editing.name}`} icon="📈" onClose={() => setModal(null)}>
          {history.length === 0 ? (
            <div className="empty-state">No price changes recorded yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Old Price</th><th>New Price</th><th>Change</th><th>Date</th></tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>${h.oldPrice.toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>${h.newPrice.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${h.newPrice > h.oldPrice ? 'badge-red' : 'badge-green'}`}>
                        {h.newPrice > h.oldPrice ? '▲' : '▼'} {Math.abs(((h.newPrice - h.oldPrice) / h.oldPrice) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{new Date(h.changedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  );
}
