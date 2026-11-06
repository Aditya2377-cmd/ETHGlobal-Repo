import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Clock,
  Cpu,
} from 'lucide-react';

export const UnlockedResponseScreen: React.FC = () => {
  const { currentUnlockedResponse, navigateTo } = useApp();
  const [copied, setCopied] = useState(false);

  if (!currentUnlockedResponse) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '0 24px' }}>
        <div className="fin-card" style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '28px' }}>No Response Available</h2>
          <p style={{ color: '#475569', marginTop: '10px', fontSize: '18px' }}>
            There is no unlocked response to display. Submit a prompt or inspect an existing transaction in your Activity Ledger.
          </p>
          <button
            onClick={() => navigateTo('workspace')}
            className="fin-btn fin-btn-primary fin-btn-lg"
            style={{ marginTop: '24px' }}
          >
            Go to AI Workspace
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUnlockedResponse.response_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 24px 80px 24px' }}>
      {/* Confirmed Settlement Banner */}
      <div
        style={{
          backgroundColor: '#DCFCE7',
          border: '2px solid #86EFAC',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <CheckCircle2 size={28} color="#15803D" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#14532D' }}>
              Payment Settled & Response Unlocked
            </div>
            <div style={{ fontSize: '15px', color: '#166534', marginTop: '2px' }}>
              Invoice <span className="font-mono" style={{ fontWeight: 700 }}>{currentUnlockedResponse.invoice_id}</span> reconciled on Hedera Testnet.
            </div>
          </div>
        </div>

        <a
          href={currentUnlockedResponse.transaction_url}
          target="_blank"
          rel="noopener noreferrer"
          className="fin-btn fin-btn-secondary fin-btn-sm font-mono"
          style={{ fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1.5px solid #15803D', color: '#14532D' }}
        >
          <span>HashScan Receipt</span>
          <ExternalLink size={15} />
        </a>
      </div>

      {/* Main Response Document */}
      <div className="fin-card" style={{ padding: '36px', marginBottom: '28px' }}>
        {/* Header & Copy Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '2px solid #E2E8F0',
            paddingBottom: '24px',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="fin-badge fin-badge-neutral font-mono" style={{ fontSize: '14px' }}>
                {currentUnlockedResponse.model}
              </span>
              <span className="fin-badge fin-badge-hedera" style={{ fontSize: '14px' }}>
                {currentUnlockedResponse.total_tokens.toLocaleString()} tokens
              </span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
              AI Response Output
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCopy}
              className="fin-btn fin-btn-secondary fin-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}
            >
              {copied ? <Check size={18} color="#15803D" /> : <Copy size={18} />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>

            <button
              onClick={() => navigateTo('workspace')}
              className="fin-btn fin-btn-primary fin-btn-sm"
              style={{ fontSize: '16px' }}
            >
              <Sparkles size={18} />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* Prompt Card */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '20px 24px',
            marginBottom: '28px',
            border: '2px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', fontWeight: 800, marginBottom: '6px' }}>
            ORIGINAL PROMPT
          </div>
          <div style={{ fontSize: '18px', color: '#0F172A', lineHeight: 1.6, fontWeight: 500 }}>
            {currentUnlockedResponse.prompt}
          </div>
        </div>

        {/* Rendered AI Output Body (Very Large & Clear Times New Roman) */}
        <div
          style={{
            fontSize: '24px',
            lineHeight: 1.9,
            color: '#0F172A',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-sans)',
            backgroundColor: '#FFFFFF',
            padding: '40px',
            border: '2px solid #0F172A',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            overflowX: 'auto',
          }}
        >
          {currentUnlockedResponse.response_text}
        </div>
      </div>

      {/* Financial Settlement & Cryptographic Audit Receipt */}
      <div className="fin-card" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Receipt size={22} color="#047857" />
          Settlement Ledger Receipt
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            fontSize: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              TRANSACTION ID
            </div>
            <div className="font-mono" style={{ fontSize: '15px', color: '#0F172A', marginTop: '6px', wordBreak: 'break-all', fontWeight: 700 }}>
              {currentUnlockedResponse.transaction_id}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              FINAL CHARGE
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#047857', marginTop: '6px' }}>
              {currentUnlockedResponse.charge_hbar.toFixed(6)} ℏ ({currentUnlockedResponse.charge_tinybars.toLocaleString()} tinybars)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              TOKEN BREAKDOWN
            </div>
            <div className="font-mono" style={{ fontSize: '16px', color: '#0F172A', marginTop: '6px', fontWeight: 700 }}>
              {currentUnlockedResponse.prompt_tokens} in / {currentUnlockedResponse.completion_tokens} out ({currentUnlockedResponse.total_tokens} total)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
              VERIFIED SETTLEMENT
            </div>
            <div style={{ fontSize: '16px', color: '#15803D', fontWeight: 800, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} />
              Reconciled on Hedera
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
