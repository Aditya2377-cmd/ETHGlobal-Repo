import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Terminal, Receipt, Settings, AlertCircle } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeScreen, navigateTo, userAccount, viewInvoice } = useApp();

  return (
    <nav
      className="hide-on-desktop"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      }}
    >
      <button
        onClick={() => navigateTo('home')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeScreen === 'home' ? '#2563EB' : '#64748B',
          fontSize: '11px',
          fontWeight: activeScreen === 'home' ? 600 : 500,
          cursor: 'pointer',
        }}
      >
        <LayoutDashboard size={20} />
        <span>Home</span>
      </button>

      <button
        onClick={() => navigateTo('workspace')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeScreen === 'workspace' || activeScreen === 'generation_progress' ? '#2563EB' : '#64748B',
          fontSize: '11px',
          fontWeight: activeScreen === 'workspace' ? 600 : 500,
          cursor: 'pointer',
        }}
      >
        <Terminal size={20} />
        <span>Prompt</span>
      </button>

      {userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id ? (
        <button
          onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            color: '#D97706',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative' }}>
            <AlertCircle size={20} />
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#DC2626',
              }}
            />
          </div>
          <span>Pay Due</span>
        </button>
      ) : null}

      <button
        onClick={() => navigateTo('activity')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeScreen === 'activity' ? '#2563EB' : '#64748B',
          fontSize: '11px',
          fontWeight: activeScreen === 'activity' ? 600 : 500,
          cursor: 'pointer',
        }}
      >
        <Receipt size={20} />
        <span>Ledger</span>
      </button>

      <button
        onClick={() => navigateTo('settings')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: activeScreen === 'settings' ? '#2563EB' : '#64748B',
          fontSize: '11px',
          fontWeight: activeScreen === 'settings' ? 600 : 500,
          cursor: 'pointer',
        }}
      >
        <Settings size={20} />
        <span>Rates</span>
      </button>
    </nav>
  );
};
