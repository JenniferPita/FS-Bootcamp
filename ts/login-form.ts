interface LoginFieldConfig {
  input: HTMLInputElement;
  errorEl: HTMLElement;
  validate: (value: string) => string;
}

const LOGIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Ingresa tu correo electrónico.";
  }
  if (!LOGIN_EMAIL_PATTERN.test(trimmed)) {
    return "Ingresa un correo electrónico válido.";
  }
  return "";
}

function validateLoginPassword(value: string): string {
  if (!value) {
    return "Ingresa tu contraseña.";
  }
  return "";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector<HTMLFormElement>(
    "#login .form-contacto"
  );
  const feedback = document.querySelector<HTMLElement>(
    "#login .form-feedback"
  );

  if (!form || !feedback) {
    return;
  }

  const email = form.querySelector<HTMLInputElement>("#email");
  const password = form.querySelector<HTMLInputElement>("#password");
  const emailError = document.getElementById("email-error");
  const passwordError = document.getElementById("password-error");

  if (!email || !password || !emailError || !passwordError) {
    return;
  }

  const fields: LoginFieldConfig[] = [
    { input: email, errorEl: emailError, validate: validateLoginEmail },
    { input: password, errorEl: passwordError, validate: validateLoginPassword },
  ];

  const showFieldError = (field: LoginFieldConfig, message: string): void => {
    const group = field.input.closest(".form-group");
    field.errorEl.textContent = message;
    field.input.setAttribute("aria-invalid", message ? "true" : "false");
    if (group) {
      group.classList.toggle("is-invalid", Boolean(message));
    }
  };

  const validateField = (field: LoginFieldConfig): boolean => {
    const message = field.validate(field.input.value);
    showFieldError(field, message);
    field.input.closest(".form-group")?.classList.add("was-validated");
    return !message;
  };

  fields.forEach((field) => {
    field.input.addEventListener("blur", () => validateField(field));
    field.input.addEventListener("input", () => {
      if (field.input.getAttribute("aria-invalid") === "true") {
        validateField(field);
      }
    });
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

    const results = fields.map((field) => validateField(field));
    const isValid = results.every(Boolean);

    if (!isValid) {
      const firstInvalid = fields.find(
        (field) => field.input.getAttribute("aria-invalid") === "true"
      );
      firstInvalid?.input.focus();
      showFeedback("Revisa los campos marcados antes de continuar.", false);
      return;
    }

    showFeedback(
      "Datos válidos. Este proyecto es una demo sin backend, así que aquí se iniciaría tu sesión real.",
      true
    );
  });
});
