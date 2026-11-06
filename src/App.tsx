import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { WalletModal } from './components/common/WalletModal';
import { PerPayBackground } from './components/background/PerPayBackground';
import { HomeScreen } from './components/screens/HomeScreen';
import { WorkspaceScreen } from './components/screens/WorkspaceScreen';
import { GenerationProgressScreen } from './components/screens/GenerationProgressScreen';
import { InvoiceScreen } from './components/screens/InvoiceScreen';
import { UnlockedResponseScreen } from './components/screens/UnlockedResponseScreen';
import { ActivityScreen } from './components/screens/ActivityScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

const MainContent: React.FC = () => {
  const { activeScreen } = useApp();

  return (
    <main style={{ flex: 1, minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1 }}>
      {activeScreen === 'home' && <HomeScreen />}
      {activeScreen === 'workspace' && <WorkspaceScreen />}
      {activeScreen === 'generation_progress' && <GenerationProgressScreen />}
      {activeScreen === 'invoice' && <InvoiceScreen />}
      {activeScreen === 'unlocked_response' && <UnlockedResponseScreen />}
      {activeScreen === 'activity' && <ActivityScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
    </main>
  );
};

const AppShell: React.FC = () => {
  const { paletteMode } = useApp();

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Full-Screen Procedural WebGL Universe from CodePen Asset */}
      <PerPayBackground fullScreen={true} paletteMode={paletteMode} opacity={0.85} />

      {/* Content Layer Floating on Top of the Universe */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          <Sidebar />
          <MainContent />
        </div>

        <MobileNav />
        <WalletModal />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
};

export default App;
