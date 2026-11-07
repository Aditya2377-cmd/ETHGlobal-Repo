import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ActiveScreen,
  UserAccount,
  Invoice,
  UnlockedAIResponse,
  GenerationProgressState,
  TransactionRecord,
} from '../types';
import { apiClient } from '../services/api';
import { DEFAULT_MODEL_ID } from '../services/models';

interface AppContextType {
  activeScreen: ActiveScreen;
  userAccount: UserAccount | null;
  currentInvoice: Invoice | null;
  currentGenerationId: string | null;
  currentProgress: GenerationProgressState | null;
  currentUnlockedResponse: UnlockedAIResponse | null;
  transactions: TransactionRecord[];
  isBackendLive: boolean;
  isWalletModalOpen: boolean;
  isSettlingPayment: boolean;
  settlementStage: string | null;
  settlementError: string | null;
  paletteMode: 'spectrum' | 'perpay' | 'codepen';
  togglePaletteMode: () => void;
  appViewMode: 'dashboard' | 'mobile_preview';
  toggleAppViewMode: () => void;
  groqApiKey: string;
  updateGroqApiKey: (key: string) => Promise<{ valid: boolean; error?: string }>;

  // Navigation & Actions
  navigateTo: (screen: ActiveScreen) => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  connectWallet: (accountId: string, walletType: 'HashPack' | 'Blade' | 'HederaTestnetDirect') => Promise<void>;
  disconnectWallet: () => Promise<void>;
  submitPrompt: (prompt: string, modelId?: string, maxTokens?: number) => Promise<void>;
  authorizeAndPayCurrentInvoice: () => Promise<void>;
  verifyOnChainManualTransfer: () => Promise<void>;
  viewInvoice: (invoiceId: string) => Promise<void>;
  viewResponse: (generationId: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<GenerationProgressState | null>(null);
  const [currentUnlockedResponse, setCurrentUnlockedResponse] = useState<UnlockedAIResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isSettlingPayment, setIsSettlingPayment] = useState<boolean>(false);
  const [settlementStage, setSettlementStage] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [paletteMode, setPaletteMode] = useState<'spectrum' | 'perpay' | 'codepen'>('spectrum');
  const [appViewMode, setAppViewMode] = useState<'dashboard' | 'mobile_preview'>('dashboard');
  const [groqApiKey, setGroqApiKeyState] = useState<string>(() => apiClient.getGroqApiKey());

  const updateGroqApiKey = async (key: string): Promise<{ valid: boolean; error?: string }> => {
    if (!key.trim()) {
      apiClient.setGroqApiKey('');
      setGroqApiKeyState('');
      return { valid: true };
    }
    const res = await apiClient.validateGroqApiKey(key);
    if (res.valid) {
      apiClient.setGroqApiKey(key);
      setGroqApiKeyState(key);
    }
    return res;
  };

  const toggleAppViewMode = () => {
    setAppViewMode((prev) => (prev === 'dashboard' ? 'mobile_preview' : 'dashboard'));
  };

  const togglePaletteMode = () => {
    setPaletteMode((prev) => {
      if (prev === 'spectrum') return 'perpay';
      if (prev === 'perpay') return 'codepen';
      return 'spectrum';
    });
  };

  useEffect(() => {
    // Initial data hydration
    const init = async () => {
      const isLive = await apiClient.checkBackendConnection();
      setIsBackendLive(isLive);
      await refreshAccount();
      await refreshTransactions();
    };
    init();
  }, []);

  const refreshAccount = async () => {
    try {
      const acc = await apiClient.getUserAccount();
      setUserAccount(acc);
      // If user has an unpaid invoice, pre-load invoice
      if (acc.has_unpaid_invoice && acc.unpaid_invoice_id) {
        try {
          const inv = await apiClient.getInvoice(acc.unpaid_invoice_id);
          setCurrentInvoice(inv);
        } catch (e) {
          console.warn('Could not load pending invoice', e);
        }
      }
    } catch (err) {
      console.error('Failed to load user account', err);
    }
  };

  const refreshTransactions = async () => {
    try {
      const txs = await apiClient.getTransactionHistory();
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load transaction history', err);
    }
  };

  const navigateTo = (screen: ActiveScreen) => {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWalletModal = () => setIsWalletModalOpen(true);
  const closeWalletModal = () => setIsWalletModalOpen(false);

  const connectWallet = async (
    accountId: string,
    walletType: 'HashPack' | 'Blade' | 'HederaTestnetDirect'
  ) => {
    const updated = await apiClient.connectWallet(accountId, walletType);
    setUserAccount(updated);
    closeWalletModal();
  };

  const disconnectWallet = async () => {
    const updated = await apiClient.disconnectWallet();
    setUserAccount(updated);
  };

  const submitPrompt = async (
    prompt: string,
    modelId: string = DEFAULT_MODEL_ID,
    maxTokens?: number
  ) => {
    try {
      setSettlementError(null);
      navigateTo('generation_progress');

      // Submit generation request
      const res = await apiClient.submitGeneration({
        prompt,
        model: modelId,
        max_output_tokens: maxTokens,
      });

      if (!res?.generation_id) {
        throw new Error('Invalid generation response received from AI Gateway.');
      }

      setCurrentGenerationId(res.generation_id);

      // Poll real-time progress through the 5 actual stages
      const progress = await apiClient.pollGenerationProgress(res.generation_id, (state) => {
        setCurrentProgress(state);
      });

      setCurrentProgress(progress);

      // Fetch invoice ready for payment
      if (progress?.invoice_id) {
        const inv = await apiClient.getInvoice(progress.invoice_id);
        setCurrentInvoice(inv);
        await refreshAccount();
        navigateTo('invoice');
      } else {
        throw new Error('Generation completed but invoice could not be issued.');
      }
    } catch (err: any) {
      console.error('[PerPay] Prompt submission failed:', err);
      if (userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id) {
        await viewInvoice(userAccount.unpaid_invoice_id);
      } else {
        navigateTo('workspace');
      }
      // Re-throw so WorkspaceScreen can display it in the UI error state banner
      throw err;
    }
  };

  const viewInvoice = async (invoiceId: string) => {
    try {
      const inv = await apiClient.getInvoice(invoiceId);
      setCurrentInvoice(inv);
      navigateTo('invoice');
    } catch (err: any) {
      console.error('Invoice retrieval failed:', err);
      navigateTo('workspace');
    }
  };

  const viewResponse = async (generationId: string) => {
    try {
      const res = await apiClient.getResponse(generationId);
      if (res.status === 200 && res.response) {
        setCurrentUnlockedResponse(res.response);
        navigateTo('unlocked_response');
      } else if (res.status === 402) {
        // If unpaid, direct to invoice
        if (userAccount?.unpaid_invoice_id) {
          await viewInvoice(userAccount.unpaid_invoice_id);
        } else {
          navigateTo('workspace');
        }
      }
    } catch (err: any) {
      console.error('Failed to retrieve response:', err);
      navigateTo('workspace');
    }
  };

  const authorizeAndPayCurrentInvoice = async () => {
    if (!currentInvoice) return;
    if (!userAccount?.connected_wallet) {
      openWalletModal();
      return;
    }

    try {
      setIsSettlingPayment(true);
      setSettlementError(null);

      const result = await apiClient.settlePayment(
        currentInvoice.invoice_id,
        userAccount.connected_wallet,
        (stage) => setSettlementStage(stage)
      );

      // Refresh account and records safely
      try {
        await refreshAccount();
        await refreshTransactions();
      } catch (refErr) {
        console.warn('Account refresh failed after settlement:', refErr);
      }

      // Fetch newly unlocked response
      const unlocked = await apiClient.getResponse(result.generation_id);
      if (unlocked?.response) {
        setCurrentUnlockedResponse(unlocked.response);
        navigateTo('unlocked_response');
      } else {
        navigateTo('activity');
      }
    } catch (err: any) {
      console.error('Hedera payment transaction error:', err);
      const isRejection = /reject|denied|cancel|user declined/i.test(err?.message || '');
      const formattedError = isRejection
        ? 'Hedera transaction was rejected by wallet. No funds were transferred.'
        : (err?.message || 'Payment settlement failed. Please verify your Hedera account balance and network connectivity.');
      setSettlementError(formattedError);
    } finally {
      setIsSettlingPayment(false);
      setSettlementStage(null);
    }
  };

  const verifyOnChainManualTransfer = async () => {
    if (!currentInvoice) return;
    try {
      setIsSettlingPayment(true);
      setSettlementError(null);
      setSettlementStage('Querying Hedera Mirror Node for confirmed on-chain transfer...');

      const payer = userAccount?.connected_wallet || '0.0.4829103';
      const result = await apiClient.verifyOnChainPayment(currentInvoice.invoice_id, payer);

      await refreshAccount();
      await refreshTransactions();

      const unlocked = await apiClient.getResponse(result.generation_id);
      if (unlocked?.response) {
        setCurrentUnlockedResponse(unlocked.response);
        navigateTo('unlocked_response');
      } else {
        navigateTo('activity');
      }
    } catch (err: any) {
      console.error('Mirror node verification error:', err);
      setSettlementError(err.message || 'On-chain transfer not found yet.');
    } finally {
      setIsSettlingPayment(false);
      setSettlementStage(null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        userAccount,
        currentInvoice,
        currentGenerationId,
        currentProgress,
        currentUnlockedResponse,
        transactions,
        isBackendLive,
        isWalletModalOpen,
        isSettlingPayment,
        settlementStage,
        settlementError,
        paletteMode,
        togglePaletteMode,
        appViewMode,
        toggleAppViewMode,
        groqApiKey,
        updateGroqApiKey,
        navigateTo,
        openWalletModal,
        closeWalletModal,
        connectWallet,
        disconnectWallet,
        submitPrompt,
        authorizeAndPayCurrentInvoice,
        verifyOnChainManualTransfer,
        viewInvoice,
        viewResponse,
        refreshAccount,
        refreshTransactions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

