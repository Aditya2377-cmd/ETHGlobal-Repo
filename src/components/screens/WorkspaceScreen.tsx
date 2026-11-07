import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelById } from '../../services/models';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  Info,
  Shield,
  HelpCircle,
  Cpu,
  Layers,
  Zap,
  Key,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const WorkspaceScreen: React.FC = () => {
  const { userAccount, submitPrompt, viewInvoice, openWalletModal, groqApiKey, navigateTo } = useApp();
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = getModelById(selectedModelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prompt.trim() || isSubmitting) return;

    if (userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id) {
      viewInvoice(userAccount.unpaid_invoice_id);
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPrompt(prompt.trim(), selectedModelId, maxTokens);
    } catch (err: any) {
      console.error('Workspace prompt submission error:', err);
      const isCors = /failed to fetch|network|cors|access-control/i.test(err?.message || '');
      const msg = isCors
        ? 'Network / CORS error: Unable to reach AI Gateway. The server may be offline or blocking cross-origin requests.'
        : (err?.message || 'Failed to submit question to AI Gateway. Please try again.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 80px 20px' }}>
      {/* Page Heading */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A' }}>
          AI Workspace
        </h1>
        <p style={{ fontSize: '17px', color: '#475569', marginTop: '6px' }}>
          Submit prompts to Groq AI engine. Responses are generated privately, token usage is measured, and an exact x402 invoice is created.
        </p>
      </div>

      {/* Outstanding Invoice Blocker */}
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AlertCircle size={26} color="#B45309" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#92400E' }}>
                Generation Restricted: Unpaid Invoice Pending
              </div>
              <div style={{ fontSize: '15px', color: '#B45309', marginTop: '4px' }}>
                You have an unsettled invoice (<span className="font-mono" style={{ fontWeight: 800 }}>{userAccount.unpaid_invoice_id}</span>). Payper enforces one active generation per account until settlement is confirmed.
              </div>
            </div>
          </div>
          <button
            onClick={() => viewInvoice(userAccount.unpaid_invoice_id!)}
            className="fin-btn fin-btn-copper fin-btn-lg"
            style={{ border: '2px solid #B45309', fontSize: '17px', padding: '14px 24px' }}
          >
            <span>Go to Invoice</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* UI Error State Banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '28px',
            backgroundColor: '#FEE2E2',
            border: '2px solid #DC2626',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AlertCircle size={26} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#991B1B' }}>
                Question Submission Failed
              </div>
              <div style={{ fontSize: '15px', color: '#B91C1C', marginTop: '4px', lineHeight: 1.5 }}>
                {error}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="fin-btn"
            style={{
              border: '2px solid #DC2626',
              fontSize: '15px',
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              color: '#991B1B',
              fontWeight: 700,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Groq Cloud Connection Status Banner */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: groqApiKey ? '#DCFCE7' : '#EFF6FF',
          border: '2px solid',
          borderColor: groqApiKey ? '#16A34A' : '#1D4ED8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={22} color={groqApiKey ? '#15803D' : '#1D4ED8'} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: groqApiKey ? '#14532D' : '#1E40AF' }}>
              {groqApiKey
                ? 'Groq Cloud Engine: Direct LPU Cloud Inference Active'
                : 'Groq Cloud Engine: Built-in Knowledge Synthesizer Active'}
            </div>
            <div style={{ fontSize: '13px', color: groqApiKey ? '#166534' : '#3B82F6', marginTop: '2px' }}>
              {groqApiKey
                ? 'Prompts are sent directly to Groq API (Llama 3.3 70B & Mixtral) with authentic token metering.'
                : 'Connect your Groq API key (gsk_...) in Settings to query Groq Cloud live 1:1.'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('settings')}
          className="fin-btn fin-btn-secondary fin-btn-sm"
          style={{
            fontSize: '14px',
            border: '1.5px solid #0F172A',
            fontWeight: 700,
            padding: '6px 14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {groqApiKey ? 'Manage Groq Key' : 'Configure Groq Key'}
        </button>
      </div>

      {/* Workspace Form */}
      <form onSubmit={handleSubmit} className="fin-card" style={{ padding: '36px', marginBottom: '32px', border: '2px solid #0F172A' }}>
        {/* Model Selection & Limit Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          {/* Model Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              AI Model (Groq Gateway)
            </label>
            <select
              className="fin-select font-mono"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={isSubmitting || userAccount?.has_unpaid_invoice}
              style={{ fontSize: '17px', padding: '14px 18px', border: '2px solid #0F172A' }}
            >
              {(AVAILABLE_MODELS || []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} — {model.provider}
                </option>
              ))}
            </select>
          </div>

          {/* Max Output Tokens */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Max Output Tokens
              </label>
              <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#1D4ED8' }}>
                {maxTokens} tokens
              </span>
            </div>
            <input
              type="range"
              min={256}
              max={selectedModel.maxOutputTokens}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              disabled={isSubmitting || userAccount?.has_unpaid_invoice}
              style={{ width: '100%', accentColor: '#1D4ED8', cursor: 'pointer', height: '8px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              <span>256</span>
              <span>{selectedModel.maxOutputTokens}</span>
            </div>
          </div>
        </div>

        {/* Selected Model Description Pill */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            fontSize: '15px',
            color: '#334155',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Cpu size={18} color="#1D4ED8" style={{ flexShrink: 0 }} />
          <span>{selectedModel.description}</span>
        </div>

        {/* Prompt Input Area */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
              Input Prompt
            </label>
            <span style={{ fontSize: '14px', color: '#64748B' }}>
              {prompt.length} characters • ~{Math.ceil(prompt.length / 4)} tokens
            </span>
          </div>
          <textarea
            className="fin-textarea"
            rows={7}
            placeholder="Describe your question, request architectural design, or prompt for code analysis..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isSubmitting || userAccount?.has_unpaid_invoice}
            style={{
              fontSize: '18px',
              lineHeight: 1.7,
              padding: '20px',
              border: '2px solid #0F172A',
              resize: 'vertical',
            }}
          />

          {/* Quick Prompt Starters */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
              Suggested Prompt Templates
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                'Explain robotics in three concise bullet points.',
                'Explain the difference between HBAR and tinybars in two sentences.',
                'Analyze Hedera Hashgraph consensus mechanism and tinybar tokenomics',
                'Write an x402 v2 payment verification module in TypeScript',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setPrompt(template)}
                  disabled={isSubmitting || userAccount?.has_unpaid_invoice}
                  className="fin-btn"
                  style={{
                    fontSize: '15px',
                    padding: '10px 18px',
                    border: '2px solid #0F172A',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 700,
                  }}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Policy Guarantee (No fake upfront prices!) */}
        <div
          style={{
            padding: '18px 22px',
            backgroundColor: '#EFF6FF',
            border: '2px solid #1D4ED8',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={20} color="#1D4ED8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1D4ED8' }}>
              Exact Usage Billing Guarantee
            </div>
            <p style={{ fontSize: '14px', color: '#1E293B', marginTop: '4px', lineHeight: 1.5 }}>
              Your final charge is calculated from <strong>actual token usage after generation</strong> ({selectedModel.tinybarsPer1kInput} tinybars/1k input, {selectedModel.tinybarsPer1kOutput} tinybars/1k output). The generated response is held in secure escrow and released immediately upon on-chain x402 payment confirmation.
            </p>
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Shield size={16} />
            Settled via Hedera Testnet x402 v2
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting || userAccount?.has_unpaid_invoice}
            className="fin-btn fin-btn-primary fin-btn-lg"
            style={{ fontSize: '22px', padding: '18px 36px', border: '2px solid #0F172A', fontWeight: 800 }}
          >
            <Sparkles size={20} />
            <span>{isSubmitting ? 'Submitting to Gateway...' : 'Generate & Meter Tokens'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

