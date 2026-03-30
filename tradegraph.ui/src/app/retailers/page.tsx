'use client';
import { useEffect, useState } from 'react';
import { getRetailers, createRetailer, updateRetailer, deleteRetailer, type Retailer } from '@/lib/api';
import Modal from '@/components/Modal';
import { useToast } from '@/components/useToast';

const emptyForm = { name: '', contactEmail: '', region: '' };

export default function RetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [editing, setEditing] = useState<Retailer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { add, ToastContainer } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRetailers(1, 50);
      setRetailers(res.items); setTotal(res.total);
    } catch { add('error', 'Failed to load retailers'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal('create'); };
  const openEdit = (r: Retailer) => {
    setForm({ name: r.name, contactEmail: r.email, region: r.region });
    setEditing(r); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return add('error', 'Name is required');
    setSaving(true);
    try {
      if (modal === 'create') { await createRetailer(form); add('success', `Retailer "${form.name}" created!`); }
      else if (editing) { await updateRetailer(editing.id, form); add('success', `Retailer "${form.name}" updated!`); }
      setModal(null); load();
    } catch (e: unknown) { add('error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (r: Retailer) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    try { await deleteRetailer(r.id); add('success', 'Retailer deleted'); load(); }
    catch (e: unknown) { add('error', (e as Error).message); }
  };

  return (
    <div className="animate-fade">
      <ToastContainer />
      <div className="page-header">
        <div>
          <h1 className="page-title">Retailers</h1>
          <p className="page-subtitle">{total} retailers in the distribution network</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add Retailer</button>
      </div>

      <div className="glass">
        {loading ? (
          <div className="empty-state">Loading retailers...</div>
        ) : retailers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏪</div>
            No retailers yet. Add your first one!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Region</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {retailers.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</td>
                  <td>{r.email}</td>
                  <td><span className="badge badge-violet">{r.region}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Retailer' : 'Edit Retailer'} icon="🏪" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Metro Mart" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input className="form-input" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@retailer.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <input className="form-input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. West Africa" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Update'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
