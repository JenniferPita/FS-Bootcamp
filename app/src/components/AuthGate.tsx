import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');
  useEffect(() => {
    let active = true;
    async function check() {
      try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) { setState('denied'); return; }
      const { data: profile, error: profileError } = await supabase
        .from('company_users').select('is_active').eq('id', auth.user.id).single();
      if (!active) return;
      setState(!profileError && profile?.is_active === true ? 'ready' : 'denied');
      } catch {
        if (active) setState('denied');
      }
    }
    void check();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setState('denied');
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  if (state === 'loading') {
    return <main style={{padding:32}}>Comprobando tu sesión de StockFlow...</main>;
  }
  if (state === 'denied') {
    return <main style={{padding:32,maxWidth:600,margin:'4rem auto'}}>
      <h1>Inicia sesión para acceder</h1>
      <p>El área de inventario requiere una cuenta activa vinculada a una empresa.</p>
      <a href="/login.html">Ir al inicio de sesión</a>
    </main>;
  }
  return <>{children}</>;
}
