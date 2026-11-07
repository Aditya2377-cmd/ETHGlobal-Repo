import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../../services/models';
import {
  Wallet,
  Send,
  Sparkles,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

export const PhoneAppPreview: React.FC = () => {
  const {
    userAccount,
    transactions,
    submitPrompt,
    viewInvoice,
    openWalletModal,
    navigateTo,
  } = useApp();

  const [promptText, setPromptText] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [activeTab, setActiveTab] = useState<'pay' | 'history'>('pay');

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    if (userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id) {
      viewInvoice(userAccount.unpaid_invoice_id);
      return;
    }

    await submitPrompt(promptText.trim(), selectedModelId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <span
          className="fin-badge"
          style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600 }}
        >
          📱 Interactive Smartphone App Preview (PhonePe / GPay Style)
        </span>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
          Fully functional fintech mobile experience — submit prompts, review invoices, and authorize on-chain settlements.
        </p>
      </div>

      {/* iPhone Frame */}
      <div className="phone-frame">
        {/* Dynamic Island */}
        <div className="phone-dynamic-island">
          <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>9:41</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
          <span style={{ fontSize: '10px', color: '#94A3B8' }}>5G</span>
        </div>

        {/* Screen Content */}
        <div className="phone-screen-content">
          {/* Top App Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/payper-logo.png"
                alt="Payper"
                style={{ width: '40px', height: '40px', borderRadius: '0px', objectFit: 'contain', border: '1.5px solid #0F172A', padding: '2px', backgroundColor: '#FFFFFF' }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '22px', color: '#0F172A', lineHeight: 1 }}>Payper</div>
                <div style={{ fontSize: '13px', color: '#1D4ED8', marginTop: '4px', fontWeight: 700 }}>Hedera Testnet • x402</div>
              </div>
            </div>

            {/* Wallet Avatar */}
            <div
              onClick={openWalletModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #0F172A',
                cursor: 'pointer',
              }}
            >
              <Wallet size={16} color="#059669" />
              <span className="font-mono" style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                {userAccount?.connected_wallet?.slice(0, 7) || '0.0.4829...'}
              </span>
            </div>
          </div>

          {/* Pending Invoice Warning */}
          {userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id && (
            <div
              onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                backgroundColor: '#FEF3C7',
                border: '2px solid #B45309',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 800, fontSize: '14px' }}>
                <AlertCircle size={16} />
                <span>Unsettled Invoice Pending</span>
              </div>
              <div style={{ fontSize: '13px', color: '#92400E', marginTop: '4px' }}>
                Tap to pay <span className="font-mono" style={{ fontWeight: 800 }}>{userAccount.unpaid_invoice_id}</span> on Hedera →
              </div>
            </div>
          )}

          {/* PhonePe-Style Wallet Balance Card */}
          <div
            style={{
              padding: '22px 24px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Available Testnet Balance
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A' }}>
                    {userAccount?.testnet_balance_hbar.toFixed(4) || '48.9521'}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#1D4ED8' }}>ℏ HBAR</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  padding: '6px 12px',
                  border: '1.5px solid #A7F3D0',
                  fontWeight: 800,
                }}
              >
                Zero Gas
              </span>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => navigateTo('workspace')}
                className="fin-btn fin-btn-primary"
                style={{ fontSize: '15px', padding: '12px 14px', border: '2px solid #0F172A', fontWeight: 800 }}
              >
                <Sparkles size={16} />
                <span>Run Prompt</span>
              </button>
              <button
                onClick={() => navigateTo('activity')}
                className="fin-btn fin-btn-secondary"
                style={{ fontSize: '15px', padding: '12px 14px', border: '2px solid #0F172A', fontWeight: 800 }}
              >
                <Receipt size={16} />
                <span>History</span>
              </button>
            </div>
          </div>

          {/* In-App Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              marginBottom: '18px',
            }}
          >
            <button
              onClick={() => setActiveTab('pay')}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                borderRight: '1px solid #0F172A',
                backgroundColor: activeTab === 'pay' ? '#1D4ED8' : '#FFFFFF',
                color: activeTab === 'pay' ? '#FFFFFF' : '#0F172A',
                cursor: 'pointer',
              }}
            >
              AI Playground
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                backgroundColor: activeTab === 'history' ? '#1D4ED8' : '#FFFFFF',
                color: activeTab === 'history' ? '#FFFFFF' : '#0F172A',
                cursor: 'pointer',
              }}
            >
              Recent Settlements
            </button>
          </div>

          {/* Tab 1: AI Playground inside Phone Frame */}
          {activeTab === 'pay' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Model Chip Carousel */}
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'block' }}>
                  Select Model:
                </span>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {(AVAILABLE_MODELS || []).map((m) => {
                    const isSel = m.id === selectedModelId;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModelId(m.id)}
                        style={{
                          padding: '8px 14px',
                          border: isSel ? '2px solid #1D4ED8' : '2px solid #CBD5E1',
                          backgroundColor: isSel ? '#1D4ED8' : '#FFFFFF',
                          color: isSel ? '#FFFFFF' : '#0F172A',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.name.replace(' Versatile', '').replace(' Instant', '')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Box */}
              <form onSubmit={handleSendPrompt} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ask anything (e.g. Write a Hedera smart contract transfer script)..."
                  className="fin-textarea"
                  style={{
                    flex: 1,
                    minHeight: '130px',
                    fontSize: '16px',
                    padding: '14px',
                    marginBottom: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #0F172A',
                    lineHeight: 1.6,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Est. Charge: ~2,500 tinybars (0.000025 ℏ)
                  </span>
                  <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                    Post-Gen Settle
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!promptText.trim()}
                  className="fin-btn fin-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '17px', border: '2px solid #0F172A', fontWeight: 800 }}
                >
                  <Send size={16} />
                  <span>Generate & Bill Usage</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Recent History inside Phone Frame */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(transactions || []).slice(0, 5).map((tx) => (
                <div
                  key={tx.event_id}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #0F172A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      {tx.model.replace('llama-3.3-', 'Llama ').replace('-versatile', '')}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1D4ED8' }}>
                      {tx.charge_hbar.toFixed(6)} ℏ
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.prompt_snippet}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                      ✓ Verified On-Chain
                    </span>
                    <a
                      href={tx.transaction_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#1D4ED8', textDecoration: 'none', fontWeight: 700 }}
                    >
                      HashScan →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

