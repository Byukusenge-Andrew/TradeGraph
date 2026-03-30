'use client';

import { useState, useTransition } from 'react';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await login(form);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Background decoration elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: 400, height: 400,
        background: 'rgba(0, 212, 255, 0.05)', borderRadius: '50%', filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%', width: 500, height: 500,
        background: 'rgba(168, 85, 247, 0.05)', borderRadius: '50%', filter: 'blur(100px)'
      }} />

      <div className="modal-box animate-fade" style={{ position: 'relative', zIndex: 1, padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #0099bb, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
          }}>⬡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>TradeGraph</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Sign in to manage the supply chain</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--red)', borderRadius: 8, fontSize: 13, marginBottom: 20, border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input name="username" className="form-input" placeholder="admin" required autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="password123" required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }} disabled={isPending}>
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          <div>Development Mode</div>
          <div>Use admin / password123</div>
        </div>
      </div>
    </div>
  );
}
