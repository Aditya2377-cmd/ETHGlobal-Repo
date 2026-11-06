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

  // Navigation & Actions
  navigateTo: (screen: ActiveScreen) => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  connectWallet: (accountId: string, walletType: 'HashPack' | 'Blade' | 'HederaTestnetDirect') => Promise<void>;
  disconnectWallet: () => Promise<void>;
  submitPrompt: (prompt: string, modelId?: string, maxTokens?: number) => Promise<void>;
  authorizeAndPayCurrentInvoice: () => Promise<void>;
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

      setCurrentGenerationId(res.generation_id);

      // Poll real-time progress through the 5 actual stages
      const progress = await apiClient.pollGenerationProgress(res.generation_id, (state) => {
        setCurrentProgress(state);
      });

      setCurrentProgress(progress);

      // Fetch invoice ready for payment
      if (progress.invoice_id) {
        const inv = await apiClient.getInvoice(progress.invoice_id);
        setCurrentInvoice(inv);
        await refreshAccount();
        navigateTo('invoice');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit generation');
      if (userAccount?.has_unpaid_invoice && userAccount.unpaid_invoice_id) {
        viewInvoice(userAccount.unpaid_invoice_id);
      } else {
        navigateTo('workspace');
      }
    }
  };

  const viewInvoice = async (invoiceId: string) => {
    try {
      const inv = await apiClient.getInvoice(invoiceId);
      setCurrentInvoice(inv);
      navigateTo('invoice');
    } catch (err: any) {
      alert(err?.message || 'Invoice not found');
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
          viewInvoice(userAccount.unpaid_invoice_id);
        } else {
          alert('HTTP 402: Payment required to unlock this AI generation response.');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to retrieve response');
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

      // Refresh account and records
      await refreshAccount();
      await refreshTransactions();

      // Fetch newly unlocked response
      const unlocked = await apiClient.getResponse(result.generation_id);
      if (unlocked.response) {
        setCurrentUnlockedResponse(unlocked.response);
        setIsSettlingPayment(false);
        setSettlementStage(null);
        navigateTo('unlocked_response');
      } else {
        setIsSettlingPayment(false);
        setSettlementStage(null);
        navigateTo('activity');
      }
    } catch (err: any) {
      setIsSettlingPayment(false);
      setSettlementStage(null);
      setSettlementError(err?.message || 'Payment settlement failed. Please try again.');
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
        navigateTo,
        openWalletModal,
        closeWalletModal,
        connectWallet,
        disconnectWallet,
        submitPrompt,
        authorizeAndPayCurrentInvoice,
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

