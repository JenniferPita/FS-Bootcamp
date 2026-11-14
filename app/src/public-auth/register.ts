import { supabase } from '../lib/supabase';
import { busy, getInput, setFeedback, setFieldError } from './helpers';

const form = document.querySelector<HTMLFormElement>('#registro .form-contacto');
const feedback = document.querySelector<HTMLElement>('#registro .form-feedback');

if (form && feedback) {
  const currentForm = form;
  const currentFeedback = feedback;
  const chosenPlan = new URLSearchParams(window.location.search).get('plan');
  const planSelect = currentForm.querySelector<HTMLSelectElement>('#plan');
  if (planSelect && chosenPlan && ['initial', 'professional', 'enterprise'].includes(chosenPlan)) {
    planSelect.value = chosenPlan;
  }

  currentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = getInput(currentForm, 'nombre').value.trim();
    const company = getInput(currentForm, 'empresa').value.trim();
    const warehouse = getInput(currentForm, 'bodega').value.trim();
    const email = getInput(currentForm, 'email').value.trim().toLowerCase();
    const password = getInput(currentForm, 'password').value;
    const confirm = getInput(currentForm, 'password-confirm').value;
    const terms = getInput(currentForm, 'terminos').checked;
    const plan = planSelect?.value ?? 'initial';

    const errors: Record<string, string> = {
      nombre: name.length < 2 ? 'Ingresa tu nombre completo (mínimo 2 caracteres).' : '',
      empresa: !company ? 'El nombre de la empresa es obligatorio.' : '',
      bodega: !warehouse ? 'Ingresa el nombre de la bodega inicial.' : '',
      plan: !['initial', 'professional', 'enterprise'].includes(plan) ? 'Selecciona un plan válido.' : '',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Ingresa un correo válido.' : '',
      password: password.length < 8 || password.length > 128 ? 'La contraseña debe tener entre 8 y 128 caracteres.' : '',
      'password-confirm': confirm !== password ? 'Las contraseñas no coinciden.' : '',
      terminos: !terms ? 'Debes aceptar los términos.' : '',
    };
    Object.entries(errors).forEach(([field, message]) => setFieldError(currentForm, field, message));
    const firstInvalid = Object.entries(errors).find(([, message]) => message);
    if (firstInvalid) {
      currentForm.querySelector<HTMLElement>(`#${firstInvalid[0]}`)?.focus();
      setFeedback(currentFeedback, 'Revisa los campos marcados para continuar.', false);
      return;
    }

    busy(currentForm, true);
    setFeedback(currentFeedback, 'Creando empresa y usuario administrador...', true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: {
          stockflow_registration: true,
          company_name: company,
          admin_name: name,
          warehouse_name: warehouse,
          plan_code: plan,
        } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('El registro no devolvió un usuario.');
      if (!data.session) {
        setFeedback(currentFeedback, 'Solicitud recibida. Revisa tu correo para confirmar la cuenta, si la confirmación está habilitada. El acceso a StockFlow se activará al confirmar.', true);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('company_users').select('id, is_active').eq('id', data.user.id).single();
      if (profileError || !profile?.is_active) {
        setFeedback(currentFeedback, 'La cuenta se creó, pero no se pudo verificar el perfil de empresa. No vuelvas a registrarte: revisa la configuración de Supabase.', false);
        return;
      }
      setFeedback(currentFeedback, 'Cuenta creada. Redirigiendo al panel...', true);
      window.location.assign('/app/');
    } catch (error) {
      setFeedback(currentFeedback, error instanceof Error ? error.message : 'No se pudo crear la cuenta.', false);
    } finally {
      busy(currentForm, false);
    }
  });
}
