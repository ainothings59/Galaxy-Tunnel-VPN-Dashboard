import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { AppProvider } from './contexts/AppContext';
import { Apps } from './pages/Apps';
import { Contact } from './pages/Contact';
import { Servers } from './pages/Servers';
import { Settings } from './pages/Settings';
import { SublinkGenerator } from './pages/SublinkGenerator';
import { Page } from './types';

function getPageFromPathname(pathname: string): Page {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/download' || path.startsWith('/download/') || path === '/apps') {
    return 'apps';
  }
  if (path === '/sublink') {
    return 'sublink';
  }
  if (path === '/settings') {
    return 'settings';
  }
  if (path === '/contact') {
    return 'contact';
  }
  return 'servers';
}

const PAGE_PATHS: Record<Page, string> = {
  servers: '/',
  sublink: '/sublink',
  apps: '/download/galaxytunnel_apk',
  settings: '/settings',
  contact: '/contact',
};

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [page, setPage] = useState<Page>(() => getPageFromPathname(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPathname(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (nextPage: Page) => {
    setPage(nextPage);
    const targetPath = PAGE_PATHS[nextPage] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (page) {
      case 'servers': return <Servers />;
      case 'sublink': return <SublinkGenerator />;
      case 'apps': return <Apps />;
      case 'settings': return <Settings />;
      case 'contact': return <Contact />;
      default: return <Servers />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a18] text-stone-900 dark:text-stone-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
      <Toast />
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        currentPage={page}
        onNavigate={handleNavigate}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        {renderPage()}
      </main>

      <footer className="text-center py-6 text-xs text-stone-500 dark:text-stone-500 mt-8 border-t border-stone-200 dark:border-zinc-800">
        <p>© 2026 Galaxy Tunnel Team. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
