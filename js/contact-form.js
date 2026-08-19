"use strict";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateNombre(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Ingresa tu nombre.";
    }
    if (trimmed.length < 2) {
        return "El nombre debe tener al menos 2 caracteres.";
    }
    return "";
}
function validateEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Ingresa tu correo electrónico.";
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
        return "Ingresa un correo electrónico válido.";
    }
    return "";
}
function validateMensaje(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Escribe tu mensaje.";
    }
    if (trimmed.length < 10) {
        return "El mensaje debe tener al menos 10 caracteres.";
    }
    return "";
}
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#contacto .form-contacto");
    const feedback = document.querySelector("#contacto .form-feedback");
    if (!form || !feedback) {
        return;
    }
    const nombre = form.querySelector("#nombre");
    const email = form.querySelector("#email");
    const mensaje = form.querySelector("#mensaje");
    const nombreError = document.getElementById("nombre-error");
    const emailError = document.getElementById("email-error");
    const mensajeError = document.getElementById("mensaje-error");
    if (!nombre ||
        !email ||
        !mensaje ||
        !nombreError ||
        !emailError ||
        !mensajeError) {
        return;
    }
    const fields = [
        { input: nombre, errorEl: nombreError, validate: validateNombre },
        { input: email, errorEl: emailError, validate: validateEmail },
        { input: mensaje, errorEl: mensajeError, validate: validateMensaje },
    ];
    const showFieldError = (field, message) => {
        const group = field.input.closest(".form-group");
        field.errorEl.textContent = message;
        field.input.setAttribute("aria-invalid", message ? "true" : "false");
        if (group) {
            group.classList.toggle("is-invalid", Boolean(message));
        }
    };
    const validateField = (field) => {
        const message = field.validate(field.input.value);
        showFieldError(field, message);
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
    const showFeedback = (message, isSuccess) => {
        feedback.textContent = message;
        feedback.classList.toggle("is-success", isSuccess);
        feedback.classList.toggle("is-error", !isSuccess);
    };
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const results = fields.map((field) => validateField(field));
        const isValid = results.every(Boolean);
        if (!isValid) {
            const firstInvalid = fields.find((field) => field.input.getAttribute("aria-invalid") === "true");
            firstInvalid?.input.focus();
            showFeedback("Revisa los campos marcados antes de continuar.", false);
            return;
        }
        showFeedback("¡Gracias! Tu mensaje fue enviado correctamente.", true);
        form.reset();
        fields.forEach((field) => showFieldError(field, ""));
    });
});
