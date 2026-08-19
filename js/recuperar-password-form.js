"use strict";
const RECOVER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateRecoverEmail(value) {
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
    const form = document.querySelector("#recuperar-password .form-contacto");
    const feedback = document.querySelector("#recuperar-password .form-feedback");
    if (!form || !feedback) {
        return;
    }
    const email = form.querySelector("#email");
    const emailError = document.getElementById("email-error");
    if (!email || !emailError) {
        return;
    }
    const field = {
        input: email,
        errorEl: emailError,
        validate: validateRecoverEmail,
    };
    const showFieldError = (message) => {
        const group = field.input.closest(".form-group");
        field.errorEl.textContent = message;
        field.input.setAttribute("aria-invalid", message ? "true" : "false");
        if (group) {
            group.classList.toggle("is-invalid", Boolean(message));
        }
    };
    const validateField = () => {
        const message = field.validate(field.input.value);
        showFieldError(message);
        return !message;
    };
    field.input.addEventListener("blur", validateField);
    field.input.addEventListener("input", () => {
        if (field.input.getAttribute("aria-invalid") === "true") {
            validateField();
        }
    });
    const showFeedback = (message, isSuccess) => {
        feedback.textContent = message;
        feedback.classList.toggle("is-success", isSuccess);
        feedback.classList.toggle("is-error", !isSuccess);
    };
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateField()) {
            field.input.focus();
            showFeedback("Revisa el campo marcado antes de continuar.", false);
            return;
        }
        showFeedback("Si el correo existe en nuestro sistema, te enviaremos instrucciones para restablecer tu contraseña.", true);
        form.reset();
        showFieldError("");
    });
});
