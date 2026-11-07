import React from 'react';
import { useApp } from '../../context/AppContext';
import { Wallet, Plus, Smartphone, Monitor, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    userAccount,
    openWalletModal,
    navigateTo,
    activeScreen,
    paletteMode,
    togglePaletteMode,
    appViewMode,
    toggleAppViewMode,
  } = useApp();

  return (
    <header
      style={{
        height: '76px',
        backgroundColor: '#FFFFFF',
        borderBottom: '2px solid #0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Brand & Hedera Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          onClick={() => navigateTo('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
        >
          <img
            src="/payper-logo.png"
            alt="Payper"
            style={{
              height: '46px',
              width: 'auto',
              borderRadius: '0px',
              display: 'block',
              objectFit: 'contain',
              border: '1.5px solid #0F172A',
              padding: '2px',
              backgroundColor: '#FFFFFF',
            }}
          />
          <span style={{ fontWeight: 800, fontSize: '28px', letterSpacing: '-0.025em', color: '#0F172A' }}>
            Payper
          </span>
        </div>

        {/* Network Badge */}
        <span
          className="fin-badge fin-badge-hedera hide-on-mobile"
          style={{ fontSize: '14px', padding: '7px 16px', border: '2px solid #1E40AF', fontWeight: 700 }}
        >
          hedera:testnet • x402 v2
        </span>

        {/* Mode Pill */}
        <span
          className="fin-badge hide-on-mobile"
          style={{
            backgroundColor: '#F8FAFC',
            color: '#0F172A',
            border: '2px solid #CBD5E1',
            fontSize: '13px',
            padding: '7px 14px',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#16A34A',
              display: 'inline-block',
            }}
          />
          Usage-Based AI Gateway
        </span>

        {/* Hedera Code Showcase Link */}
        <a
          href="./hedera-code.html"
          target="_blank"
          rel="noopener noreferrer"
          className="fin-badge hide-on-mobile"
          style={{
            backgroundColor: '#0F172A',
            color: '#00E39E',
            border: '2px solid #00E39E',
            fontSize: '13px',
            padding: '7px 14px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <span>⚡ Hedera Code</span>
        </a>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* App View Mode Switcher */}
        <button
          onClick={toggleAppViewMode}
          className="fin-btn fin-btn-secondary"
          title="Toggle between Interactive Smartphone App Preview and Fullscreen Dashboard"
          style={{
            backgroundColor: appViewMode === 'mobile_preview' ? '#EFF6FF' : '#FFFFFF',
            borderColor: appViewMode === 'mobile_preview' ? '#1D4ED8' : '#0F172A',
            color: appViewMode === 'mobile_preview' ? '#1D4ED8' : '#0F172A',
            fontWeight: 700,
            fontSize: '15px',
            padding: '10px 18px',
            borderWidth: '2px',
          }}
        >
          {appViewMode === 'mobile_preview' ? (
            <>
              <Monitor size={18} color="#1D4ED8" />
              <span>🖥️ Switch to Dashboard</span>
            </>
          ) : (
            <>
              <Smartphone size={18} color="#2563EB" />
              <span>📱 Mobile App View</span>
            </>
          )}
        </button>

        {/* Wallet Pill */}
        {userAccount?.connected_wallet ? (
          <button
            onClick={openWalletModal}
            className="fin-btn fin-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              border: '2px solid #0F172A',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Wallet size={16} color="#059669" />
            <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              {userAccount.connected_wallet}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#047857',
                backgroundColor: '#ECFDF5',
                padding: '3px 8px',
                fontWeight: 800,
                border: '1.5px solid #A7F3D0',
              }}
            >
              {userAccount.testnet_balance_hbar.toFixed(4)} ℏ
            </span>
          </button>
        ) : (
          <button
            onClick={openWalletModal}
            className="fin-btn fin-btn-secondary"
            style={{ fontSize: '15px', padding: '10px 18px', border: '2px solid #0F172A', fontWeight: 700 }}
          >
            <Wallet size={16} />
            <span>Connect Wallet</span>
          </button>
        )}

        {/* New AI Request CTA */}
        {activeScreen !== 'workspace' && (
          <button
            onClick={() => navigateTo('workspace')}
            className="fin-btn fin-btn-primary"
            style={{ fontSize: '15px', padding: '10px 22px', border: '2px solid #0F172A', fontWeight: 800 }}
          >
            <Plus size={18} />
            <span>New Prompt</span>
          </button>
        )}
      </div>
    </header>
  );
};
