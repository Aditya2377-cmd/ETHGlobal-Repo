import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  Receipt,
  ExternalLink,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Download,
} from 'lucide-react';

export const ActivityScreen: React.FC = () => {
  const { transactions, viewResponse } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING'>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (!tx) return false;
      const matchesSearch =
        (tx.invoice_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.request_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.prompt_snippet || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.transaction_id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || tx.payment_status === statusFilter;

      const matchesModel =
        modelFilter === 'ALL' || tx.model === modelFilter;

      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [transactions, searchQuery, statusFilter, modelFilter]);

  const exportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    const headers = ['Timestamp', 'Request ID', 'Invoice ID', 'Model', 'Prompt', 'Total Tokens', 'HBAR Charge', 'Tinybars', 'Transaction ID', 'Status'];
    const rows = (filteredTransactions || []).map((tx) => [
      tx.timestamp,
      tx.request_id,
      tx.invoice_id,
      tx.model,
      `"${tx.prompt_snippet.replace(/"/g, '""')}"`,
      tx.total_tokens,
      tx.charge_hbar,
      tx.charge_tinybars,
      tx.transaction_id,
      tx.payment_status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payper_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 80px 24px' }}>
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
            Activity & Settlement Ledger
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', marginTop: '4px' }}>
            Complete audit trail of AI token meterings settled on Hedera Testnet
          </p>
        </div>

        {transactions.length > 0 && (
          <button
            onClick={exportCSV}
            className="fin-btn fin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', padding: '12px 22px', border: '2px solid #0F172A', fontWeight: 800 }}
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="fin-card"
        style={{
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          border: '2px solid #0F172A',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
          <Search size={20} color="#64748B" style={{ position: 'absolute', left: '16px', top: '15px' }} />
          <input
            type="text"
            className="fin-input"
            placeholder="Search by invoice, prompt text, or transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '48px', fontSize: '17px', border: '2px solid #0F172A', padding: '14px 18px 14px 48px' }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="fin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ width: 'auto', minWidth: '160px', fontSize: '16px', padding: '14px 18px', border: '2px solid #0F172A', fontWeight: 700 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      {filteredTransactions.length === 0 ? (
        <div
          className="fin-card"
          style={{
            padding: '56px 28px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            border: '2px solid #0F172A',
          }}
        >
          <Receipt size={48} color="#64748B" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
            No Matching Transactions
          </h3>
          <p style={{ fontSize: '15px', color: '#475569', marginTop: '6px' }}>
            No records match the current filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="fin-table-container">
          <table className="fin-table" style={{ border: '2px solid #0F172A', backgroundColor: '#FFFFFF' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Consensus Date</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Invoice / Request</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Model</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Prompt Summary</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Tokens</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Amount (HBAR)</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Hedera Tx ID</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Status</th>
                <th style={{ fontSize: '15px', padding: '16px 20px', borderBottom: '2px solid #0F172A' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(filteredTransactions || []).map((tx) => (
                <tr key={tx.event_id} style={{ borderBottom: '1px solid #CBD5E1' }}>
                  <td className="font-mono" style={{ whiteSpace: 'nowrap', fontSize: '14px', color: '#475569', padding: '18px 20px' }}>
                    {new Date(tx.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div className="font-mono" style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                      {tx.invoice_id}
                    </div>
                    <div className="font-mono" style={{ fontSize: '13px', color: '#64748B' }}>
                      {tx.request_id}
                    </div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="fin-badge fin-badge-neutral font-mono" style={{ fontSize: '13px', padding: '4px 10px', border: '1.5px solid #CBD5E1' }}>
                      {tx.model.split('-')[0]}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', padding: '18px 20px' }}>
                    <div style={{ fontSize: '15px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.prompt_snippet}
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontSize: '15px', padding: '18px 20px', fontWeight: 600 }}>
                    {tx.total_tokens.toLocaleString()}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '15px', padding: '18px 20px' }}>
                    {tx.charge_hbar.toFixed(8)} ℏ
                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{tx.charge_tinybars.toLocaleString()} tinybars</div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <a
                      href={tx.transaction_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{
                        fontSize: '14px',
                        color: '#1D4ED8',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Inspect on Hedera HashScan"
                    >
                      <span>{tx.transaction_id.slice(0, 16)}...</span>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span className="fin-badge fin-badge-success" style={{ fontSize: '13px', border: '1.5px solid #86EFAC' }}>
                      <CheckCircle size={14} />
                      {tx.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <button
                      onClick={() => viewResponse(tx.generation_id)}
                      className="fin-btn fin-btn-secondary fin-btn-sm"
                      style={{ fontSize: '14px', padding: '8px 16px', border: '2px solid #0F172A', fontWeight: 700 }}
                    >
                      View Output
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
