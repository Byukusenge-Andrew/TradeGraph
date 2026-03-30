'use client';
import { useEffect, useRef, useState } from 'react';
import { getGraphNodes, getSuppliers, createRelationship, deleteRelationship, type GraphNode, type Supplier } from '@/lib/api';
import Modal from '@/components/Modal';
import { useToast } from '@/components/useToast';

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<unknown>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fromSupplierId: '', toSupplierId: '', strength: 50 });
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const { add, ToastContainer } = useToast();

  const loadAndDraw = async () => {
    try {
      const [n, s] = await Promise.all([getGraphNodes(), getSuppliers(1, 200)]);
      setNodes(n); setSuppliers(s.items);
      await drawGraph(n);
    } catch { add('error', 'Could not load graph — ensure GraphService is running'); }
  };

  const drawGraph = async (graphNodes: GraphNode[]) => {
    if (!containerRef.current || graphNodes.length === 0) return;
    const { Network, DataSet } = await import('vis-network/standalone');
    const visNodes = new DataSet(graphNodes.map(n => ({
      id: n.id,
      label: n.name,
      color: n.type === 'Supplier'
        ? { background: '#0d1d2a', border: '#00d4ff', highlight: { background: '#0a2535', border: '#00d4ff' } }
        : { background: '#1a0d2a', border: '#a855f7', highlight: { background: '#1f1035', border: '#a855f7' } },
      font: { color: n.type === 'Supplier' ? '#00d4ff' : '#a855f7', size: 12, face: 'Inter' },
      shape: n.type === 'Supplier' ? 'dot' : 'diamond',
      size: n.type === 'Supplier' ? 18 : 12,
      borderWidth: 2,
    })));

    const visEdges = new DataSet<{ id: string; from: string; to: string; arrows: string; color: object; width: number }>([]);

    if (networkRef.current) {
      (networkRef.current as { destroy: () => void }).destroy();
    }

    networkRef.current = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, {
      physics: { stabilization: { iterations: 100 }, barnesHut: { gravitationalConstant: -8000, springLength: 150 } },
      interaction: { hover: true, tooltipDelay: 200 },
      edges: { smooth: { type: 'continuous', enabled: true, roundness: 0.5 } },
      nodes: { shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 8 } },
    });

    (networkRef.current as { on: (e: string, cb: (p: { nodes: string[] }) => void) => void }).on('click', (params: { nodes: string[] }) => {
      if (params.nodes.length > 0) {
        const found = graphNodes.find(n => n.id === params.nodes[0]);
        setSelectedNode(found ?? null);
      } else {
        setSelectedNode(null);
      }
    });
  };

  useEffect(() => { loadAndDraw(); }, []);

  const handleAddRelationship = async () => {
    if (!form.fromSupplierId || !form.toSupplierId) return add('error', 'Select both suppliers');
    if (form.fromSupplierId === form.toSupplierId) return add('error', 'Cannot link a supplier to itself');
    setSaving(true);
    try {
      await createRelationship({ ...form });
      add('success', 'Relationship created! Graph updated 🕸');
      setModal(false); loadAndDraw();
    } catch (e: unknown) { add('error', (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fade">
      <ToastContainer />
      <div className="page-header">
        <div>
          <h1 className="page-title">Supply Chain Graph</h1>
          <p className="page-subtitle">Live Neo4j node/edge visualization · {nodes.length} nodes</p>
        </div>
        <button className="btn btn-violet" onClick={() => setModal(true)}>＋ Add Relationship</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Graph Canvas */}
        <div className="glass" style={{ height: 560, position: 'relative', overflow: 'hidden' }}>
          {nodes.length === 0 ? (
            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state-icon">🕸️</div>
              <div>No graph nodes yet.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create a Supplier or Product and it will appear here automatically!</div>
            </div>
          ) : (
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Legend */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
            {[
              { color: 'var(--cyan)', shape: '●', label: 'Supplier Node' },
              { color: 'var(--violet)', shape: '◆', label: 'Product Node' },
              { color: 'var(--text-muted)', shape: '→', label: 'SUPPLIES Edge' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: l.color, fontSize: 16 }}>{l.shape}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Selected Node */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Selected Node
            </div>
            {selectedNode ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: selectedNode.type === 'Supplier' ? 'var(--cyan)' : 'var(--violet)', marginBottom: 6 }}>
                  {selectedNode.name}
                </div>
                <span className={`badge ${selectedNode.type === 'Supplier' ? 'badge-cyan' : 'badge-violet'}`}>
                  {selectedNode.type}
                </span>
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  ID: {selectedNode.id}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click a node to inspect</div>
            )}
          </div>

          {/* Stats */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Suppliers</span>
              <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{nodes.filter(n => n.type === 'Supplier').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Products</span>
              <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{nodes.filter(n => n.type === 'Product').length}</span>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={loadAndDraw} style={{ width: '100%' }}>
            ↻ Refresh Graph
          </button>
        </div>
      </div>

      {modal && (
        <Modal title="Add Supply Relationship" icon="🕸️" onClose={() => setModal(false)}>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--violet-dim)', borderRadius: 8, border: '1px solid rgba(168,85,247,0.15)' }}>
            <div style={{ fontSize: 12, color: 'var(--violet)' }}>Creates a <strong>SUPPLIES</strong> edge in Neo4j between two suppliers</div>
          </div>
          <div className="form-group">
            <label className="form-label">From Supplier</label>
            <select className="form-input" value={form.fromSupplierId} onChange={e => setForm(f => ({ ...f, fromSupplierId: e.target.value }))}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">To Supplier</label>
            <select className="form-input" value={form.toSupplierId} onChange={e => setForm(f => ({ ...f, toSupplierId: e.target.value }))}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Strength: {form.strength}%</label>
            <input type="range" min={1} max={100} value={form.strength} onChange={e => setForm(f => ({ ...f, strength: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--violet)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-violet" onClick={handleAddRelationship} disabled={saving}>{saving ? 'Creating...' : 'Create Relationship'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
