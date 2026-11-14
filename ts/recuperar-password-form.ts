interface RecoverFieldConfig {
  input: HTMLInputElement;
  errorEl: HTMLElement;
  validate: (value: string) => string;
}

const RECOVER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRecoverEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Ingresa tu correo electrónico.";
  }
  if (!RECOVER_EMAIL_PATTERN.test(trimmed)) {
    return "Ingresa un correo electrónico válido.";
  }
  return "";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector<HTMLFormElement>(
    "#recuperar-password .form-contacto"
  );
  const feedback = document.querySelector<HTMLElement>(
    "#recuperar-password .form-feedback"
  );

  if (!form || !feedback) {
    return;
  }

  const email = form.querySelector<HTMLInputElement>("#email");
  const emailError = document.getElementById("email-error");

  if (!email || !emailError) {
    return;
  }

  const field: RecoverFieldConfig = {
    input: email,
    errorEl: emailError,
    validate: validateRecoverEmail,
  };

  const showFieldError = (message: string): void => {
    const group = field.input.closest(".form-group");
    field.errorEl.textContent = message;
    field.input.setAttribute("aria-invalid", message ? "true" : "false");
    if (group) {
      group.classList.toggle("is-invalid", Boolean(message));
    }
  };

  const validateField = (): boolean => {
    const message = field.validate(field.input.value);
    showFieldError(message);
    field.input.closest(".form-group")?.classList.add("was-validated");
    return !message;
  };

  field.input.addEventListener("blur", validateField);
  field.input.addEventListener("input", () => {
    if (field.input.getAttribute("aria-invalid") === "true") {
      validateField();
    }
  });

  const showFeedback = (message: string, isSuccess: boolean): void => {
    feedback.textContent = message;
    feedback.classList.toggle("is-success", isSuccess);
    feedback.classList.toggle("is-error", !isSuccess);
  };

  const clearErrorFeedback = (): void => {
    if (feedback.classList.contains("is-error")) {
      feedback.textContent = "";
      feedback.classList.remove("is-error");
    }
  };

  form.addEventListener("focusin", clearErrorFeedback);
  form.addEventListener("input", clearErrorFeedback);
  form.addEventListener("change", clearErrorFeedback);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateField()) {
      field.input.focus();
      showFeedback("Revisa el campo marcado antes de continuar.", false);
      return;
    }

    showFeedback(
      "Si el correo existe en nuestro sistema, te enviaremos instrucciones para restablecer tu contraseña.",
      true
    );
    form.reset();
    showFieldError("");
    field.input.closest(".form-group")?.classList.remove("was-validated");
  });
});
