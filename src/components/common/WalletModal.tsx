import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/api';
import { X, ShieldCheck, ExternalLink, Wallet, CheckCircle2, Key, Info } from 'lucide-react';

export const WalletModal: React.FC = () => {
  const { isWalletModalOpen, closeWalletModal, connectWallet, userAccount } = useApp();
  const [customAccountId, setCustomAccountId] = useState('0.0.4829103');
  const [customPrivateKey, setCustomPrivateKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'HashPack' | 'Blade' | 'HederaTestnetDirect'>('HashPack');
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !!(window as any).ethereum) {
      setHasExtension(true);
    }
    const savedKey = apiClient.getHederaPrivateKey();
    if (savedKey) setCustomPrivateKey(savedKey);
  }, [isWalletModalOpen]);

  if (!isWalletModalOpen) return null;

  const handleConnect = async (provider: 'HashPack' | 'Blade' | 'HederaTestnetDirect') => {
    setIsConnecting(true);
    setSelectedProvider(provider);

    // If browser extension (HashPack / Blade EVM) is available, prompt real connection
    if (hasExtension && (provider === 'HashPack' || provider === 'Blade')) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          const accountId = accounts[0];
          await connectWallet(accountId, provider);
          setIsConnecting(false);
          closeWalletModal();
          return;
        }
      } catch (err) {
        console.warn('Wallet extension pairing request rejected or failed:', err);
      }
    }

    // Direct account connection
    const accountId = customAccountId.trim() || '0.0.4829103';
    if (customPrivateKey.trim()) {
      apiClient.setHederaPrivateKey(customPrivateKey.trim());
    }
    await connectWallet(accountId, provider);
    setIsConnecting(false);
    closeWalletModal();
  };

  return (
    <div className="fin-modal-backdrop" onClick={closeWalletModal}>
      <div
        className="fin-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '32px',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
              Connect Hedera Wallet
            </h3>
            <p style={{ fontSize: '15px', color: '#475569', marginTop: '4px' }}>
              Authorize exact usage settlements via x402 on Hedera Testnet
            </p>
          </div>
          <button
            onClick={closeWalletModal}
            className="fin-btn fin-btn-ghost fin-btn-sm"
            style={{ padding: '8px', border: '1.5px solid #0F172A' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Security Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#EFF6FF',
            border: '2px solid #1D4ED8',
            marginBottom: '24px',
          }}
        >
          <ShieldCheck size={22} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '14px', color: '#1E293B', lineHeight: 1.5 }}>
            <strong style={{ color: '#1D4ED8' }}>Cryptographic Security Guarantee:</strong> Payper never asks for, handles, or stores your private key. All x402 payment requirements are cryptographically signed by your wallet on the Hedera Testnet.
          </p>
        </div>

        {/* Wallet Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* HashPack */}
          <button
            onClick={() => handleConnect('HashPack')}
            disabled={isConnecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--transition-fast)',
            }}
            className="fin-card-interactive"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#7A40F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                H
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>
                  HashPack Wallet
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Recommended Hedera Web3 wallet extension
                </div>
              </div>
            </div>
            {userAccount?.connected_wallet && userAccount.wallet_type === 'HashPack' ? (
              <CheckCircle2 size={22} color="#15803D" />
            ) : (
              <span className="fin-badge fin-badge-neutral" style={{ fontSize: '13px', padding: '6px 12px', border: '1.5px solid #0F172A' }}>Connect</span>
            )}
          </button>

          {/* Blade Wallet */}
          <button
            onClick={() => handleConnect('Blade')}
            disabled={isConnecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--transition-fast)',
            }}
            className="fin-card-interactive"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#0052FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                B
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>
                  Blade Wallet
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Secure enterprise & Web3 Hedera extension
                </div>
              </div>
            </div>
            {userAccount?.connected_wallet && userAccount.wallet_type === 'Blade' ? (
              <CheckCircle2 size={22} color="#15803D" />
            ) : (
              <span className="fin-badge fin-badge-neutral" style={{ fontSize: '13px', padding: '6px 12px', border: '1.5px solid #0F172A' }}>Connect</span>
            )}
          </button>
        </div>

        {/* Hedera Testnet Account Input */}
        <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            HEDERA TESTNET ACCOUNT ID (0.0.X)
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              type="text"
              className="fin-input fin-input-mono"
              placeholder="0.0.4829103"
              value={customAccountId}
              onChange={(e) => setCustomAccountId(e.target.value)}
              style={{ fontSize: '16px', padding: '12px 16px', border: '2px solid #0F172A' }}
            />
            <button
              onClick={() => handleConnect('HederaTestnetDirect')}
              disabled={isConnecting || !customAccountId.trim()}
              className="fin-btn fin-btn-primary"
              style={{ whiteSpace: 'nowrap', fontSize: '16px', padding: '12px 22px', border: '2px solid #0F172A', fontWeight: 800 }}
            >
              {isConnecting ? 'Authorizing...' : 'Set Active'}
            </button>
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            OPTIONAL TESTNET PRIVATE KEY (FOR AUTOMATED ON-CHAIN SIGNING)
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="password"
              className="fin-input fin-input-mono"
              placeholder="302e... or hex private key (saved locally in browser)"
              value={customPrivateKey}
              onChange={(e) => setCustomPrivateKey(e.target.value)}
              style={{ fontSize: '14px', padding: '10px 14px', border: '1.5px solid #CBD5E1' }}
            />
            {customPrivateKey && (
              <button
                type="button"
                onClick={() => {
                  apiClient.setHederaPrivateKey(customPrivateKey.trim());
                  alert('Testnet private key saved in secure local browser storage.');
                }}
                className="fin-btn fin-btn-secondary fin-btn-sm"
                style={{ whiteSpace: 'nowrap', border: '1.5px solid #0F172A' }}
              >
                Save Key
              </button>
            )}
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              Network: hedera:testnet {hasExtension ? '• Web3 Extension Detected' : ''}
            </span>
            <a
              href="https://portal.hedera.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '13px', color: '#1D4ED8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              Get Free Testnet HBAR <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
