import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Loader2, Shield, Lock, FileText, Cpu, Coins } from 'lucide-react';

export const GenerationProgressScreen: React.FC = () => {
  const { currentProgress, currentGenerationId } = useApp();

  const stages = [
    { step: 1, title: 'Validating Request', desc: 'FastAPI gateway parameter and account restriction checks', icon: Shield },
    { step: 2, title: 'Private AI Generation', desc: 'Streaming prompt completion through Groq engine', icon: Cpu },
    { step: 3, title: 'Actual Token Accounting', desc: 'Retrieved exact input & output tokenizer consumption', icon: FileText },
    { step: 4, title: 'Hedera Charge Calculation', desc: 'Determining exact tinybar charge at testnet network rate', icon: Coins },
    { step: 5, title: 'x402 Invoice Generation', desc: 'Response secured in escrow; HTTP 402 invoice created', icon: Lock },
  ];

  const currentStep = currentProgress?.step_number || 1;

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 16px 80px 16px' }}>
      <div className="fin-card" style={{ padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-forest-light)',
              color: 'var(--color-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Loader2 size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Processing AI Generation
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Generation ID: <span className="font-mono">{currentGenerationId || 'gen_init...'}</span>
          </p>
        </div>

        {/* Real Step Progression */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          {stages.map((st) => {
            const isCompleted = currentStep > st.step;
            const isCurrent = currentStep === st.step;
            const Icon = st.icon;

            return (
              <div
                key={st.step}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  opacity: isCompleted || isCurrent ? 1 : 0.45,
                  transition: 'opacity var(--transition-normal)',
                }}
              >
                {/* Step Indicator */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted
                      ? 'var(--status-success-bg)'
                      : isCurrent
                      ? 'var(--color-forest-light)'
                      : 'var(--color-surface-subtle)',
                    color: isCompleted
                      ? 'var(--status-success)'
                      : isCurrent
                      ? 'var(--color-forest)'
                      : 'var(--color-text-muted)',
                    border: `1px solid ${
                      isCompleted
                        ? 'rgba(47, 118, 90, 0.3)'
                        : isCurrent
                        ? 'var(--color-forest)'
                        : 'var(--color-border)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="var(--status-success)" />
                  ) : isCurrent ? (
                    <span className="font-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{st.step}</span>
                  ) : (
                    <span className="font-mono" style={{ fontSize: '12px' }}>{st.step}</span>
                  )}
                </div>

                {/* Step Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {st.title}
                    </span>
                    {isCurrent && (
                      <span className="fin-badge fin-badge-info" style={{ fontSize: '10px' }}>
                        In Progress
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {st.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Notice */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          <Lock size={12} style={{ display: 'inline', marginRight: '6px' }} />
          Response generated privately and encrypted in escrow. Token usage is locked to invoice.
        </div>
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

