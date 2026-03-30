'use client';
import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, type Supplier } from '@/lib/api';
import Modal from '@/components/Modal';
import { useToast } from '@/components/useToast';

const emptyForm = { name: '', contactEmail: '', region: '', isActive: true };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { add, ToastContainer } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSuppliers(1, 50);
      setSuppliers(res.items); setTotal(res.total);
    } catch { add('error', 'Failed to load suppliers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal('create'); };
  const openEdit = (s: Supplier) => {
    setForm({ name: s.name, contactEmail: s.contactEmail, region: s.region, isActive: s.isActive });
    setEditing(s); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return add('error', 'Name and email required');
    setSaving(true);
    try {
      if (modal === 'create') {
        await createSupplier(form);
        add('success', `Supplier "${form.name}" created!`);
      } else if (editing) {
        await updateSupplier(editing.id, form);
        add('success', `Supplier "${form.name}" updated!`);
      }
      setModal(null); load();
    } catch (e: unknown) { add('error', (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      await deleteSupplier(s.id);
      add('success', `Supplier deleted`);
      load();
    } catch (e: unknown) { add('error', (e as Error).message); }
  };

  return (
    <div className="animate-fade">
      <ToastContainer />
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">{total} total suppliers in the network</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add Supplier</button>
      </div>

      <div className="glass">
        {loading ? (
          <div className="empty-state">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏭</div>
            No suppliers yet. Create your first one!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Region</th>
                <th>Status</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</td>
                  <td>{s.contactEmail}</td>
                  <td><span className="badge badge-cyan">{s.region}</span></td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {s.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>{s.products?.length ?? 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'New Supplier' : 'Edit Supplier'}
          icon="🏭"
          onClose={() => setModal(null)}
        >
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Steel Corp Ltd" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input className="form-input" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@supplier.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <input className="form-input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. East Africa" />
          </div>
          {modal === 'edit' && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
