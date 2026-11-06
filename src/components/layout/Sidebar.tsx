import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Terminal,
  Receipt,
  Settings,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeScreen, navigateTo, userAccount, viewInvoice } = useApp();

  return (
    <aside
      className="hide-on-mobile"
      style={{
        width: '280px',
        backgroundColor: '#FFFFFF',
        borderRight: '2px solid #0F172A',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 18px',
        minHeight: 'calc(100vh - 76px)',
        position: 'sticky',
        top: '76px',
        boxShadow: '2px 0 8px 0 rgba(0, 0, 0, 0.04)',
      }}
    >
      <div>
        {/* Navigation Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Overview / Home */}
          <button
            onClick={() => navigateTo('home')}
            className="fin-btn"
            style={{
              justifyContent: 'flex-start',
              width: '100%',
              backgroundColor: activeScreen === 'home' ? '#EFF6FF' : '#FFFFFF',
              color: activeScreen === 'home' ? '#1D4ED8' : '#0F172A',
              fontWeight: activeScreen === 'home' ? 800 : 600,
              border: activeScreen === 'home' ? '2px solid #1D4ED8' : '2px solid #E2E8F0',
              padding: '14px 18px',
              fontSize: '18px',
            }}
          >
            <LayoutDashboard size={22} color={activeScreen === 'home' ? '#1D4ED8' : '#0F172A'} />
            <span>Dashboard</span>
          </button>

          {/* AI Workspace */}
          <button
            onClick={() => navigateTo('workspace')}
            className="fin-btn"
            style={{
              justifyContent: 'flex-start',
              width: '100%',
              backgroundColor: activeScreen === 'workspace' || activeScreen === 'generation_progress' ? '#EFF6FF' : '#FFFFFF',
              color: activeScreen === 'workspace' || activeScreen === 'generation_progress' ? '#1D4ED8' : '#0F172A',
              fontWeight: activeScreen === 'workspace' || activeScreen === 'generation_progress' ? 800 : 600,
              border: activeScreen === 'workspace' || activeScreen === 'generation_progress' ? '2px solid #1D4ED8' : '2px solid #E2E8F0',
              padding: '14px 18px',
              fontSize: '18px',
            }}
          >
            <Terminal size={22} color={activeScreen === 'workspace' ? '#1D4ED8' : '#0F172A'} />
            <span>AI Playground</span>
          </button>

          {/* Activity / Transactions */}
          <button
            onClick={() => navigateTo('activity')}
            className="fin-btn"
            style={{
              justifyContent: 'flex-start',
              width: '100%',
              backgroundColor: activeScreen === 'activity' ? '#EFF6FF' : '#FFFFFF',
              color: activeScreen === 'activity' ? '#1D4ED8' : '#0F172A',
              fontWeight: activeScreen === 'activity' ? 800 : 600,
              border: activeScreen === 'activity' ? '2px solid #1D4ED8' : '2px solid #E2E8F0',
              padding: '14px 18px',
              fontSize: '18px',
            }}
          >
            <Receipt size={22} color={activeScreen === 'activity' ? '#1D4ED8' : '#0F172A'} />
            <span>Activity Ledger</span>
          </button>

          {/* Settings & Pricing */}
          <button
            onClick={() => navigateTo('settings')}
            className="fin-btn"
            style={{
              justifyContent: 'flex-start',
              width: '100%',
              backgroundColor: activeScreen === 'settings' ? '#EFF6FF' : '#FFFFFF',
              color: activeScreen === 'settings' ? '#1D4ED8' : '#0F172A',
              fontWeight: activeScreen === 'settings' ? 800 : 600,
              border: activeScreen === 'settings' ? '2px solid #1D4ED8' : '2px solid #E2E8F0',
              padding: '14px 18px',
              fontSize: '18px',
            }}
          >
            <Settings size={22} color={activeScreen === 'settings' ? '#1D4ED8' : '#0F172A'} />
            <span>Pricing & Rates</span>
          </button>
        </div>

        {/* Unpaid Invoice Alert Pill in Sidebar */}
        {userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id && (
          <div
            onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#FEF3C7',
              border: '2px solid #B45309',
              borderRadius: '0px',
              cursor: 'pointer',
              transition: 'transform 120ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 800, fontSize: '15px' }}>
              <AlertCircle size={18} />
              <span>Unpaid Invoice</span>
            </div>
            <div className="font-mono" style={{ fontSize: '13px', color: '#92400E', marginTop: '6px', fontWeight: 700 }}>
              {userAccount.unpaid_invoice_id}
            </div>
            <div style={{ fontSize: '13px', color: '#B45309', marginTop: '8px', fontWeight: 700 }}>
              Settle to unlock AI output →
            </div>
          </div>
        )}
      </div>

      {/* Protocol Reference Footer */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontWeight: 700, fontSize: '14px' }}>
          <Shield size={16} color="#059669" />
          <span>x402 Protocol v2</span>
        </div>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
          Usage-based micro-charges settled via Hedera Testnet consensus.
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Treasury:</span>
          <a
            href="https://hashscan.io/testnet/account/0.0.5109822"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono"
            style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>0.0.5109822</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </aside>
  );
};
