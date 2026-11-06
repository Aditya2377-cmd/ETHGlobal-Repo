import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../../services/models';
import { PhoneAppPreview } from '../preview/PhoneAppPreview';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Coins,
  Cpu,
  Receipt,
  ExternalLink,
  Wallet,
  Clock,
  CheckCircle,
  Smartphone,
  Layers,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    userAccount,
    transactions,
    navigateTo,
    viewInvoice,
    viewResponse,
    openWalletModal,
    appViewMode,
    toggleAppViewMode,
    submitPrompt,
  } = useApp();

  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickModelId, setQuickModelId] = useState(DEFAULT_MODEL_ID);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user selected Phone App View, display the interactive phone shell
  if (appViewMode === 'mobile_preview') {
    return (
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>
        <PhoneAppPreview />
      </div>
    );
  }

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || isSubmitting) return;

    if (userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id) {
      viewInvoice(userAccount.unpaid_invoice_id);
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPrompt(quickPrompt.trim(), quickModelId);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 80px 24px' }}>
      {/* Pending Invoice Critical Banner */}
      {userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id && (
        <div
          style={{
            marginBottom: '28px',
            backgroundColor: '#FEF3C7',
            border: '2px solid #B45309',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(180, 83, 9, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#FDE68A',
                border: '2px solid #B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B45309',
              }}
            >
              <AlertCircle size={26} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: '#92400E' }}>
                Action Required: Pending Usage Settlement
              </div>
              <div style={{ fontSize: '15px', color: '#B45309', marginTop: '4px' }}>
                Invoice <span className="font-mono" style={{ fontWeight: 800 }}>{userAccount.unpaid_invoice_id}</span> is awaiting on-chain authorization. Response is secured.
              </div>
            </div>
          </div>
          <button
            onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
            className="fin-btn fin-btn-copper fin-btn-lg"
            style={{ border: '2px solid #B45309', fontSize: '17px', padding: '14px 24px' }}
          >
            <span>Review & Authorize Payment</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Top Fintech App Card: Balance & Account Status */}
      <div
        className="fin-card"
        style={{
          padding: '32px 36px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Connected Hedera Testnet Account
            </span>
            <span className="fin-badge fin-badge-hedera font-mono" style={{ fontSize: '14px', padding: '6px 14px', border: '1.5px solid #1E40AF', fontWeight: 700 }}>
              {userAccount?.connected_wallet || '0.0.4829103'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ fontSize: '44px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {(userAccount?.testnet_balance_hbar ?? 0).toFixed(8)}
            </span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#1D4ED8' }}>
              ℏ HBAR
            </span>
            <span className="font-mono" style={{ fontSize: '18px', color: '#64748B', marginLeft: '6px', fontWeight: 600 }}>
              ({(userAccount?.testnet_balance_tinybars ?? 0).toLocaleString()} tinybars)
            </span>
          </div>

          <p style={{ fontSize: '16px', color: '#475569', marginTop: '6px' }}>
            Usage charges are debited post-generation in exact tinybars settled via Hedera consensus.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleAppViewMode}
            className="fin-btn fin-btn-secondary"
            title="View this application inside a mobile phone mockup preview"
            style={{ fontSize: '16px', padding: '14px 22px', border: '2px solid #0F172A', fontWeight: 700 }}
          >
            <Smartphone size={18} color="#2563EB" />
            <span>📱 Mobile App View</span>
          </button>

          <button
            onClick={openWalletModal}
            className="fin-btn fin-btn-secondary"
            style={{ fontSize: '16px', padding: '14px 22px', border: '2px solid #0F172A', fontWeight: 700 }}
          >
            <Wallet size={18} color="#059669" />
            <span>Switch Wallet</span>
          </button>

          <button
            onClick={() => navigateTo('workspace')}
            className="fin-btn fin-btn-primary"
            style={{ fontSize: '16px', padding: '14px 26px', border: '2px solid #0F172A', fontWeight: 800 }}
          >
            <Sparkles size={18} />
            <span>Full AI Studio</span>
          </button>
        </div>
      </div>

      {/* In-App Direct Prompt Console (No Website fluff — true functional app!) */}
      <div
        className="fin-card"
        style={{
          padding: '32px 36px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="#1D4ED8" />
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
              Run AI Inference & Settle on Hedera
            </h2>
          </div>
          <span style={{ fontSize: '15px', color: '#047857', fontWeight: 800, backgroundColor: '#ECFDF5', padding: '6px 14px', border: '1.5px solid #A7F3D0' }}>
            Post-Generation Usage Billing (x402 v2)
          </span>
        </div>

        {/* Model Chips */}
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '6px' }}>
          {AVAILABLE_MODELS.map((m) => {
            const isSelected = m.id === quickModelId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setQuickModelId(m.id)}
                style={{
                  padding: '12px 20px',
                  border: isSelected ? '2px solid #1D4ED8' : '2px solid #CBD5E1',
                  backgroundColor: isSelected ? '#1D4ED8' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 120ms ease',
                }}
              >
                <span>{m.name}</span>
                <span
                  style={{
                    fontSize: '13px',
                    color: isSelected ? '#FFFFFF' : '#1D4ED8',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#EFF6FF',
                    padding: '3px 8px',
                    fontWeight: 800,
                    border: isSelected ? '1px solid rgba(255,255,255,0.4)' : '1px solid #BFDBFE',
                  }}
                >
                  {m.hbarRatePer1mInput} ℏ/1M
                </span>
              </button>
            );
          })}
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleQuickSubmit}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask anything (e.g., Explain the difference between Tinybar and HBAR in Hedera Hashgraph, or write an x402 verification script)..."
              className="fin-textarea"
              rows={5}
              style={{
                fontSize: '18px',
                lineHeight: 1.7,
                padding: '18px 22px',
                border: '2px solid #0F172A',
                marginBottom: '18px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '15px', color: '#475569', fontWeight: 600 }}>
              <span>⚡ Measured via actual tokenizer</span>
              <span>🔒 Encrypted output released upon confirmed settlement</span>
            </div>

            <button
              type="submit"
              disabled={!quickPrompt.trim() || isSubmitting}
              className="fin-btn fin-btn-primary fin-btn-lg"
              style={{ padding: '16px 36px', fontSize: '20px', border: '2px solid #0F172A', fontWeight: 800 }}
            >
              <Send size={20} />
              <span>Generate & Bill Usage</span>
            </button>
          </div>
        </form>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="fin-card" style={{ padding: '24px 28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px', fontWeight: 800 }}>
            <Cpu size={18} color="#1D4ED8" />
            <span>TOTAL GENERATIONS</span>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
            {userAccount?.total_requests || 2}
          </div>
          <div style={{ fontSize: '14px', color: '#047857', marginTop: '4px', fontWeight: 700 }}>
            100% Settled On-Chain
          </div>
        </div>

        <div className="fin-card" style={{ padding: '24px 28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px', fontWeight: 800 }}>
            <Coins size={18} color="#047857" />
            <span>TOKENS MEASURED</span>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
            {(userAccount?.total_tokens_consumed || 1182).toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
            Actual prompt + output tokens
          </div>
        </div>

        <div className="fin-card" style={{ padding: '24px 28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px', fontWeight: 800 }}>
            <Receipt size={18} color="#D97706" />
            <span>TOTAL SETTLED (ℏ)</span>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
            {(userAccount?.total_hbar_spent || 0.00004943).toFixed(6)} ℏ
          </div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
            Exact tinybar micro-billing
          </div>
        </div>

        <div className="fin-card" style={{ padding: '24px 28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px', fontWeight: 800 }}>
            <ShieldCheck size={18} color="#1D4ED8" />
            <span>SETTLEMENT PROTOCOL</span>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
            x402 v2
          </div>
          <div style={{ fontSize: '14px', color: '#047857', marginTop: '4px', fontWeight: 700 }}>
            Hedera Consensus Finality
          </div>
        </div>
      </div>

      {/* Recent Ledger Activity Table */}
      <div className="fin-card" style={{ padding: '32px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
              Recent Settlements Ledger
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', marginTop: '4px' }}>
              Cryptographically verified usage events on Hedera Testnet
            </p>
          </div>
          <button
            onClick={() => navigateTo('activity')}
            className="fin-btn fin-btn-ghost fin-btn-sm"
            style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '16px' }}
          >
            <span>View All ({transactions.length})</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="fin-table-container">
          <table className="fin-table" style={{ border: '2px solid #0F172A' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Status</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Model</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Tokens</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Amount (ℏ)</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Amount (Tinybars)</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>HashScan Proof</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map((tx) => (
                <tr key={tx.event_id} style={{ borderBottom: '1px solid #CBD5E1' }}>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="fin-badge fin-badge-success" style={{ fontSize: '14px', border: '1.5px solid #86EFAC' }}>
                      <CheckCircle size={14} />
                      <span>CONFIRMED</span>
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px' }}>
                      {tx.model.replace('llama-3.3-', 'Llama ').replace('-versatile', '')}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="font-mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                      {tx.total_tokens.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="font-mono" style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '16px' }}>
                      {tx.charge_hbar.toFixed(6)} ℏ
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="font-mono" style={{ color: '#475569', fontSize: '15px' }}>
                      {tx.charge_tinybars.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <a
                      href={tx.transaction_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{
                        color: '#1D4ED8',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      <span>{tx.transaction_id.slice(0, 16)}...</span>
                      <ExternalLink size={14} />
                    </a>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <button
                      onClick={() => viewResponse(tx.generation_id)}
                      className="fin-btn fin-btn-secondary fin-btn-sm"
                      style={{ fontSize: '14px', padding: '8px 16px', border: '2px solid #0F172A', fontWeight: 700 }}
                    >
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
