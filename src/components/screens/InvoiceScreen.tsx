import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QRCode } from '../common/QRCode';
import {
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Wallet,
  ArrowRight,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

export const InvoiceScreen: React.FC = () => {
  const {
    currentInvoice,
    userAccount,
    authorizeAndPayCurrentInvoice,
    verifyOnChainManualTransfer,
    openWalletModal,
    isSettlingPayment,
    settlementStage,
    settlementError,
    navigateTo,
  } = useApp();

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'qr'>('wallet');
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  if (!currentInvoice) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center', padding: '0 16px' }}>
        <div className="fin-card" style={{ padding: '32px' }}>
          <FileText size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3>No Active Invoice</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '6px', fontSize: '14px' }}>
            There is no pending invoice for review. Submit a prompt in the AI Workspace.
          </p>
          <button
            onClick={() => navigateTo('workspace')}
            className="fin-btn fin-btn-primary fin-btn-sm"
            style={{ marginTop: '16px' }}
          >
            Go to AI Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 20px 80px 20px' }}>
      {/* Top Breadcrumb & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
            Usage Invoice Review
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', marginTop: '4px' }}>
            x402 payment requirements issued by Payper AI Gateway • Settled on Hedera Testnet
          </p>
        </div>

        <span
          className={`fin-badge ${currentInvoice.status === 'PAID'
            ? 'fin-badge-success'
            : 'fin-badge-warning'
            }`}
          style={{ fontSize: '16px', padding: '8px 20px', border: '2px solid' }}
        >
          {currentInvoice.status === 'PAID' ? 'PAID & DELIVERED' : 'PAYMENT REQUIRED'}
        </span>
      </div>

      {/* Invoice Document Sheet */}
      <div
        className="fin-card"
        style={{
          padding: '36px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
          marginBottom: '28px',
        }}
      >
        {/* Invoice Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0F172A',
            paddingBottom: '24px',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', fontWeight: 700 }}>
              INVOICE IDENTIFIER
            </div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {currentInvoice.invoice_id}
            </div>
            <div className="font-mono" style={{ fontSize: '15px', color: '#475569', marginTop: '4px' }}>
              Generation: {currentInvoice.generation_id}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', fontWeight: 700 }}>
              NETWORK / PROTOCOL
            </div>
            <span className="fin-badge fin-badge-hedera" style={{ marginTop: '6px', fontSize: '15px', padding: '6px 16px', border: '2px solid #1E40AF', fontWeight: 700 }}>
              hedera:testnet • x402 v2
            </span>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
              Issued: {currentInvoice.created_at ? new Date(currentInvoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </div>
          </div>
        </div>

        {/* Prompt Overview */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '20px 24px',
            marginBottom: '28px',
            border: '2px solid #CBD5E1',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase' }}>
            PROMPT DESCRIPTION ({currentInvoice.model || 'AI Model'})
          </div>
          <div style={{ fontSize: '18px', color: '#0F172A', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{currentInvoice.prompt_snippet || 'No prompt description available'}"
          </div>
        </div>

        {/* Token Accounting Line Items */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Token Accounting & Metering
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Input Tokens */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', padding: '10px 0', borderBottom: '1px dashed #CBD5E1' }}>
              <span style={{ color: '#475569' }}>Input Tokens (Prompt Validation)</span>
              <span className="font-mono" style={{ color: '#0F172A', fontWeight: 700 }}>
                {(currentInvoice.prompt_tokens ?? 0).toLocaleString()} tokens
              </span>
            </div>

            {/* Output Tokens */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', padding: '10px 0', borderBottom: '1px dashed #CBD5E1' }}>
              <span style={{ color: '#475569' }}>Output Tokens (Groq Completion)</span>
              <span className="font-mono" style={{ color: '#0F172A', fontWeight: 700 }}>
                {(currentInvoice.completion_tokens ?? 0).toLocaleString()} tokens
              </span>
            </div>

            {/* Total Tokens */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '19px', padding: '14px 0', borderBottom: '2px solid #0F172A' }}>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>Total Measured Tokens</span>
              <span className="font-mono" style={{ fontWeight: 800, color: '#0F172A' }}>
                {(currentInvoice.total_tokens ?? 0).toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Prominent Payment Amount Breakdown */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '2px solid #1D4ED8',
            padding: '28px 32px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1D4ED8', fontWeight: 800 }}>
                EXACT AMOUNT DUE
              </div>
              <div className="font-mono" style={{ fontSize: '46px', fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1, marginTop: '8px' }}>
                {(currentInvoice.charge_hbar ?? 0).toFixed(8)} ℏ
              </div>
              <div className="font-mono" style={{ fontSize: '18px', color: '#475569', marginTop: '8px', fontWeight: 700 }}>
                {(currentInvoice.charge_tinybars ?? 0).toLocaleString()} tinybars
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 700 }}>Receiving Treasury Account:</div>
              <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {currentInvoice.receiving_account}
              </div>
              <div style={{ fontSize: '13px', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
                Hedera Testnet Consensus Finality
              </div>
            </div>
          </div>
        </div>

        {/* Expandable x402 Technical Protocol Details */}
        <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: '18px', marginBottom: '28px' }}>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              cursor: 'pointer',
              color: '#0F172A',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" />
              x402 v2 Cryptographic Technical Specifications
            </span>
            {showTechnicalDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showTechnicalDetails && (
            <div
              style={{
                marginTop: '14px',
                padding: '18px',
                backgroundColor: '#F8FAFC',
                border: '2px solid #CBD5E1',
                fontSize: '14px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '10px' }}>
                <span style={{ color: '#64748B', fontWeight: 700 }}>x402 Version:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>2.0</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Payment Scheme:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>exact</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Network:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>hedera:testnet</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Asset Identifier:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>0.0.0 (Native HBAR)</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Transfer Method:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>cryptoTransfer</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Recipient:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{currentInvoice.receiving_account}</span>

                <span style={{ color: '#64748B', fontWeight: 700 }}>Exact Tinybars:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{currentInvoice.charge_tinybars}</span>
              </div>
            </div>
          )}
        </div>

        {/* Settlement Path Diagram */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#FFFFFF',
            border: '2px solid #0F172A',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '15px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} color="#059669" />
            <span className="font-mono" style={{ fontWeight: 700, color: '#0F172A' }}>{userAccount?.connected_wallet || 'Customer Wallet'}</span>
          </div>
          <span style={{ color: '#0F172A', fontWeight: 800, fontSize: '18px' }}>→</span>
          <span className="fin-badge fin-badge-hedera" style={{ fontSize: '13px', padding: '6px 14px', border: '1.5px solid #1E40AF', fontWeight: 700 }}>
            Hedera Consensus
          </span>
          <span style={{ color: '#0F172A', fontWeight: 800, fontSize: '18px' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} color="#059669" />
            <span className="font-mono" style={{ fontWeight: 700, color: '#0F172A' }}>{currentInvoice.receiving_account}</span>
          </div>
        </div>

        {/* Payment Method Selector (Option 1: Wallet vs Option 2: QR Payment) */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Choose Payment Method (Hedera Testnet)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className="fin-btn"
              style={{
                backgroundColor: paymentMethod === 'wallet' ? '#1D4ED8' : '#FFFFFF',
                color: paymentMethod === 'wallet' ? '#FFFFFF' : '#0F172A',
                border: '2px solid #0F172A',
                fontWeight: 800,
                fontSize: '18px',
                padding: '18px 24px',
              }}
            >
              <Wallet size={20} />
              <span>Option 1: Wallet Sign</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('qr')}
              className="fin-btn"
              style={{
                backgroundColor: paymentMethod === 'qr' ? '#1D4ED8' : '#FFFFFF',
                color: paymentMethod === 'qr' ? '#FFFFFF' : '#0F172A',
                border: '2px solid #0F172A',
                fontWeight: 800,
                fontSize: '18px',
                padding: '18px 24px',
              }}
            >
              <QrCode size={20} />
              <span>Option 2: QR Transfer</span>
            </button>
          </div>
        </div>

        {/* QR Code Payment Panel */}
        {paymentMethod === 'qr' && (
          <div
            style={{
              padding: '32px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #0F172A',
              marginBottom: '28px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              Scan QR Code with Hedera Mobile Wallet
            </div>

            <div style={{ display: 'inline-block', marginBottom: '20px', padding: '12px', border: '2px solid #0F172A', backgroundColor: '#FFFFFF' }}>
              <QRCode
                value={`hedera:testnet?account=${currentInvoice.receiving_account}&amount=${currentInvoice.charge_tinybars}&memo=${currentInvoice.invoice_id}`}
                size={220}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '600px',
                margin: '0 auto 20px auto',
                textAlign: 'left',
                fontSize: '15px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1.5px solid #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 700 }}>Recipient Account:</span>
                <span className="font-mono" style={{ fontWeight: 800, color: '#0F172A' }}>{currentInvoice.receiving_account}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1.5px solid #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 700 }}>Exact Amount:</span>
                <span className="font-mono" style={{ fontWeight: 800, color: '#1D4ED8' }}>
                  {(currentInvoice.charge_hbar ?? 0).toFixed(8)} ℏ ({(currentInvoice.charge_tinybars ?? 0).toLocaleString()} tinybars)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#FEF3C7', border: '1.5px solid #F59E0B' }}>
                <span style={{ color: '#92400E', fontWeight: 700 }}>Required Memo (Invoice Link):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="font-mono" style={{ fontWeight: 800, color: '#B45309', fontSize: '16px' }}>{currentInvoice.invoice_id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentInvoice.invoice_id);
                      setCopiedMemo(true);
                      setTimeout(() => setCopiedMemo(false), 2000);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309', padding: '4px' }}
                    title="Copy Memo"
                  >
                    {copiedMemo ? <Check size={16} color="#15803D" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, maxWidth: '580px', margin: '0 auto' }}>
              <strong style={{ color: '#0F172A' }}>Important:</strong> You must include the exact Invoice ID in the transaction memo so our payment engine automatically identifies and unlocks your AI response.
            </p>
          </div>
        )}

        {/* Error Notice */}
        {settlementError && (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FEE2E2',
              border: '2px solid #DC2626',
              color: '#B91C1C',
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>{settlementError}</span>
          </div>
        )}

        {/* Settlement Actions */}
        {isSettlingPayment ? (
          <div
            style={{
              padding: '32px',
              backgroundColor: '#EFF6FF',
              border: '2px solid #1D4ED8',
              textAlign: 'center',
            }}
          >
            <Loader2
              size={36}
              color="#1D4ED8"
              style={{ margin: '0 auto 16px auto', animation: 'spin 1.5s linear infinite' }}
            />
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E40AF' }}>
              {settlementStage || 'Executing On-Chain Settlement...'}
            </div>
            <p style={{ fontSize: '15px', color: '#3B82F6', marginTop: '6px' }}>
              Cryptographic verification in progress on Hedera Testnet consensus nodes.
            </p>
          </div>
        ) : (
          <div>
            {paymentMethod === 'qr' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={verifyOnChainManualTransfer}
                  disabled={isSettlingPayment}
                  className="fin-btn fin-btn-primary fin-btn-lg"
                  style={{ width: '100%', fontSize: '20px', padding: '18px 28px', border: '2px solid #0F172A', fontWeight: 800 }}
                >
                  <CheckCircle2 size={22} />
                  <span>Verify On-Chain Transfer on Mirror Node ({(currentInvoice.charge_hbar ?? 0).toFixed(8)} ℏ)</span>
                </button>
                <button
                  onClick={authorizeAndPayCurrentInvoice}
                  disabled={isSettlingPayment}
                  className="fin-btn fin-btn-secondary"
                  style={{ width: '100%', fontSize: '15px', padding: '12px 20px', border: '1.5px solid #64748B', fontWeight: 700 }}
                >
                  <span>Instant Consensus Settle (Automatic Testnet Receipt)</span>
                </button>
              </div>
            ) : !userAccount?.connected_wallet ? (
              <button
                onClick={openWalletModal}
                className="fin-btn fin-btn-primary fin-btn-lg"
                style={{ width: '100%', fontSize: '22px', padding: '20px 32px', border: '2px solid #0F172A', fontWeight: 800 }}
              >
                <Wallet size={24} />
                <span>Connect Wallet to Authorize Payment</span>
              </button>
            ) : (
              <button
                onClick={authorizeAndPayCurrentInvoice}
                disabled={isSettlingPayment}
                className="fin-btn fin-btn-primary fin-btn-lg"
                style={{ width: '100%', fontSize: '22px', padding: '20px 32px', border: '2px solid #0F172A', fontWeight: 800 }}
              >
                <CheckCircle2 size={24} />
                <span>Authorize & Pay {(currentInvoice.charge_hbar ?? 0).toFixed(8)} ℏ via x402</span>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

