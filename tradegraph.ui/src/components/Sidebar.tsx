'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

const nav = [
  { href: '/',            icon: '⬡',  label: 'Dashboard' },
  { href: '/suppliers',   icon: '🏭', label: 'Suppliers'  },
  { href: '/products',    icon: '📦', label: 'Products'   },
  { href: '/retailers',   icon: '🏪', label: 'Retailers'  },
  { href: '/graph',       icon: '🕸️', label: 'Graph'      },
];

export default function Sidebar() {
  const path = usePathname();
  if (path === '/login') return null;

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minHeight: '100vh',
      background: 'rgba(13,17,23,0.95)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      backdropFilter: 'blur(20px)',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #0099bb, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>TradeGraph</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Supply Chain
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {nav.map(({ href, icon, label }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                border: active ? '1px solid rgba(0, 212, 255, 0.15)' : '1px solid transparent',
                color: active ? 'var(--cyan)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
                {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)' }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <button 
          onClick={() => logout()} 
          className="btn btn-ghost" 
          style={{ width: '100%', justifyContent: 'center', marginBottom: '16px', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.3)' }}
        >
          ⇥ Logout
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>.NET 10 · Neo4j · Valkey</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Event-Driven Architecture</div>
      </div>
    </aside>
  );
}
