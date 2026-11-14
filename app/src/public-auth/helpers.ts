export function getInput(form: HTMLFormElement, id: string): HTMLInputElement {
  const el = form.querySelector<HTMLInputElement>(`#${id}`);
  if (!el) throw new Error(`Falta el campo ${id}`);
  return el;
}
export function setFieldError(form: HTMLFormElement, id: string, message: string) {
  const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
  const output = document.getElementById(`${id}-error`);
  if (output) output.textContent = message;
  input?.setAttribute('aria-invalid', message ? 'true' : 'false');
  input?.closest('.form-group')?.classList.toggle('is-invalid', Boolean(message));
}
export function setFeedback(container: HTMLElement, message: string, success: boolean) {
  container.textContent = message;
  container.classList.toggle('is-success', success);
  container.classList.toggle('is-error', !success);
}
export function busy(form: HTMLFormElement, isBusy: boolean) {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) {
    submit.disabled = isBusy;
    submit.setAttribute('aria-busy', String(isBusy));
  }
}
