import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { App } from './App';
import './styles.css';

const theme = createTheme({
  primaryColor: 'stockflow',
  colors: {
    stockflow: [
      '#ecf1ff', '#dae4ff', '#b6c9ff', '#91adff', '#6a8bff',
      '#446bff', '#2457ff', '#1741c7', '#1235a5', '#102b80',
    ],
  },
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  defaultRadius: 'md',
});

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const getScheme = (): 'light' | 'dark' => {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const [scheme, setScheme] = useState<'light' | 'dark'>(getScheme);

  useEffect(() => {
    const update = () => setScheme(getScheme());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);

  return <MantineProvider theme={theme} forceColorScheme={scheme}>{children}</MantineProvider>;
}

try {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
} catch { /* preferencia del sistema */ }

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
const root = document.getElementById('root');
if (!root) throw new Error('No existe el elemento raíz');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/app"><App /></BrowserRouter>
      </QueryClientProvider>
    </AppThemeProvider>
  </React.StrictMode>,
);
