import React from 'react';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_MODELS } from '../../services/models';
import {
  User,
  Wallet,
  Shield,
  Coins,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Server,
  Layers,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { userAccount, openWalletModal, disconnectWallet, isBackendLive, viewInvoice } = useApp();

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 80px 24px' }}>
      {/* Heading */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
          Account & Pricing Policy
        </h1>
        <p style={{ fontSize: '16px', color: '#475569', marginTop: '4px' }}>
          Hedera wallet configuration, usage accounting rates, and gateway network status
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="fin-card" style={{ padding: '32px', marginBottom: '28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#EFF6FF',
                border: '2px solid #1D4ED8',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={24} />
            </div>
            <div>
              <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                {userAccount?.user_id || 'usr_anonymous'}
              </div>
              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
                Payper Authenticated Consumer Account
              </div>
            </div>
          </div>

          <div>
            {userAccount?.connected_wallet ? (
              <button
                onClick={disconnectWallet}
                className="fin-btn fin-btn-secondary"
                style={{ fontSize: '15px', padding: '10px 20px', border: '2px solid #0F172A', fontWeight: 700 }}
              >
                Disconnect Wallet
              </button>
            ) : (
              <button
                onClick={openWalletModal}
                className="fin-btn fin-btn-primary"
                style={{ fontSize: '15px', padding: '10px 20px', border: '2px solid #0F172A', fontWeight: 800 }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Account Attributes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            fontSize: '15px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CONNECTED WALLET
            </div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
              {userAccount?.connected_wallet || 'None'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {userAccount?.wallet_type || 'Unlinked'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              HEDERA TESTNET BALANCE
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#1D4ED8', marginTop: '6px' }}>
              {userAccount?.testnet_balance_hbar !== undefined
                ? `${userAccount.testnet_balance_hbar.toFixed(4)} ℏ`
                : '0.00 ℏ'}
            </div>
            <div className="font-mono" style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {userAccount?.testnet_balance_tinybars.toLocaleString() || '0'} tinybars
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ACCOUNT STATUS
            </div>
            <div style={{ marginTop: '6px' }}>
              {userAccount?.has_unpaid_invoice ? (
                <span className="fin-badge fin-badge-warning" style={{ fontSize: '14px', border: '1.5px solid #F59E0B' }}>
                  <AlertCircle size={14} />
                  RESTRICTED (UNPAID INVOICE)
                </span>
              ) : (
                <span className="fin-badge fin-badge-success" style={{ fontSize: '14px', border: '1.5px solid #86EFAC' }}>
                  <CheckCircle2 size={14} />
                  ACTIVE & COMPLIANT
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Invoice Alert if restricted */}
      {userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id && (
        <div
          style={{
            marginBottom: '28px',
            padding: '20px 24px',
            backgroundColor: '#FEF3C7',
            border: '2px solid #B45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#92400E' }}>
              Restriction in effect for invoice {userAccount.unpaid_invoice_id}
            </div>
            <p style={{ fontSize: '14px', color: '#B45309', marginTop: '4px' }}>
              You must settle this outstanding generation before issuing subsequent AI requests.
            </p>
          </div>
          <button
            onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
            className="fin-btn fin-btn-copper"
            style={{ fontSize: '15px', padding: '10px 20px', border: '2px solid #B45309', fontWeight: 800 }}
          >
            Settle Invoice
          </button>
        </div>
      )}

      {/* Transparent Gateway Pricing Schedule */}
      <div className="fin-card" style={{ padding: '32px', marginBottom: '28px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
          Gateway Usage Pricing Schedule
        </h2>
        <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '20px' }}>
          Exact micro-charges applied post-generation based on actual token consumption
        </p>

        <div className="fin-table-container">
          <table className="fin-table" style={{ border: '2px solid #0F172A', backgroundColor: '#FFFFFF' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Model</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Provider</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Input Tinybars / 1K</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Output Tinybars / 1K</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Est. HBAR / 1M Input</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Est. HBAR / 1M Output</th>
              </tr>
            </thead>
            <tbody>
              {AVAILABLE_MODELS.map((model) => (
                <tr key={model.id} style={{ borderBottom: '1px solid #CBD5E1' }}>
                  <td style={{ fontWeight: 800, fontSize: '16px', padding: '18px 20px', color: '#0F172A' }}>{model.name}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="fin-badge fin-badge-neutral" style={{ fontSize: '13px', padding: '4px 10px', border: '1.5px solid #CBD5E1' }}>{model.provider}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '15px', padding: '18px 20px' }}>{model.tinybarsPer1kInput.toLocaleString()}</td>
                  <td className="font-mono" style={{ fontSize: '15px', padding: '18px 20px' }}>{model.tinybarsPer1kOutput.toLocaleString()}</td>
                  <td className="font-mono" style={{ fontSize: '15px', padding: '18px 20px', fontWeight: 700, color: '#1D4ED8' }}>{model.hbarRatePer1mInput} ℏ</td>
                  <td className="font-mono" style={{ fontSize: '15px', padding: '18px 20px', fontWeight: 700, color: '#1D4ED8' }}>{model.hbarRatePer1mOutput} ℏ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network & Infrastructure Details */}
      <div className="fin-card" style={{ padding: '32px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Server size={22} color="#1D4ED8" />
          Network & Protocol Architecture
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', fontSize: '15px' }}>
          <div>
            <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PAYMENT PROTOCOL
            </span>
            <div className="font-mono" style={{ fontWeight: 800, color: '#0F172A', marginTop: '6px', fontSize: '16px' }}>
              x402 Protocol v2.0
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
              HTTP 402 with cryptoTransfer
            </div>
          </div>

          <div>
            <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CONSENSUS NETWORK
            </span>
            <div className="font-mono" style={{ fontWeight: 800, color: '#0F172A', marginTop: '6px', fontSize: '16px' }}>
              hedera:testnet
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
              HashScan Mirror Node
            </div>
          </div>

          <div>
            <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              GATEWAY TREASURY
            </span>
            <div className="font-mono" style={{ fontWeight: 800, color: '#0F172A', marginTop: '6px', fontSize: '16px' }}>
              0.0.5109822
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
              Payper Verified Receiving Account
            </div>
          </div>

          <div>
            <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              GATEWAY CONNECTION
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: isBackendLive ? '#16A34A' : '#D97706',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 800, fontSize: '15px' }}>
                {isBackendLive ? 'FastAPI Gateway Active (Port 8000)' : 'Client Adapter Mode'}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
              Groq LLM + x402 Facilitator
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
