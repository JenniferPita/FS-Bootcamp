import { supabase } from '../lib/supabase';
import { busy, getInput, setFeedback, setFieldError } from './helpers';

const form = document.querySelector<HTMLFormElement>('#login .form-contacto');
const feedback = document.querySelector<HTMLElement>('#login .form-feedback');

if (form && feedback) {
  const currentForm = form;
  const currentFeedback = feedback;
  currentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = getInput(currentForm, 'email').value.trim().toLowerCase();
    const password = getInput(currentForm, 'password').value;
    const invalidEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldError(currentForm, 'email', invalidEmail ? 'Ingresa un correo válido.' : '');
    setFieldError(currentForm, 'password', !password ? 'Ingresa tu contraseña.' : '');
    if (invalidEmail || !password) {
      setFeedback(currentFeedback, 'Corrige los campos marcados.', false);
      return;
    }
    busy(currentForm, true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user || !data.session) throw new Error('No se inició la sesión.');
      const { data: profile, error: profileError } = await supabase.from('company_users')
        .select('id, is_active').eq('id', data.user.id).single();
      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        throw new Error('La cuenta no está activa o aún no está vinculada a una empresa de StockFlow.');
      }
      setFeedback(currentFeedback, 'Inicio de sesión correcto. Abriendo tu panel...', true);
      window.location.assign('/app/');
    } catch (error) {
      setFeedback(currentFeedback, error instanceof Error ? error.message : 'No se pudo iniciar sesión.', false);
    } finally {
      busy(currentForm, false);
    }
  });
}
