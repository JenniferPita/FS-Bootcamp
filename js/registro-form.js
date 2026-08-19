"use strict";
const REGISTRO_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
function validateRegistroNombre(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Ingresa tu nombre completo.";
    }
    if (trimmed.length < 2) {
        return "El nombre debe tener al menos 2 caracteres.";
    }
    return "";
}
function validateRegistroEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "Ingresa tu correo electrónico.";
    }
    if (!REGISTRO_EMAIL_PATTERN.test(trimmed)) {
        return "Ingresa un correo electrónico válido.";
    }
    return "";
}
function validatePassword(value) {
    if (!value) {
        return "Ingresa una contraseña.";
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
        return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return "";
}
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#registro .form-contacto");
    const feedback = document.querySelector("#registro .form-feedback");
    if (!form || !feedback) {
        return;
    }
    const nombre = form.querySelector("#nombre");
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const passwordConfirm = form.querySelector("#password-confirm");
    const terminos = form.querySelector("#terminos");
    const nombreError = document.getElementById("nombre-error");
    const emailError = document.getElementById("email-error");
    const passwordError = document.getElementById("password-error");
    const passwordConfirmError = document.getElementById("password-confirm-error");
    const terminosError = document.getElementById("terminos-error");
    if (!nombre ||
        !email ||
        !password ||
        !passwordConfirm ||
        !terminos ||
        !nombreError ||
        !emailError ||
        !passwordError ||
        !passwordConfirmError ||
        !terminosError) {
        return;
    }
    const validatePasswordConfirm = (value) => {
        if (!value) {
            return "Confirma tu contraseña.";
        }
        if (value !== password.value) {
            return "Las contraseñas no coinciden.";
        }
        return "";
    };
    const validateTerminos = () => terminos.checked ? "" : "Debes aceptar los términos para continuar.";
    const fields = [
        { input: nombre, errorEl: nombreError, validate: validateRegistroNombre },
        { input: email, errorEl: emailError, validate: validateRegistroEmail },
        { input: password, errorEl: passwordError, validate: validatePassword },
        {
            input: passwordConfirm,
            errorEl: passwordConfirmError,
            validate: validatePasswordConfirm,
        },
        { input: terminos, errorEl: terminosError, validate: validateTerminos },
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
        const message = field.input === terminos
            ? validateTerminos()
            : field.validate(field.input.value);
        showFieldError(field, message);
        return !message;
    };
    fields.forEach((field) => {
        const eventName = field.input.type === "checkbox" ? "change" : "blur";
        field.input.addEventListener(eventName, () => validateField(field));
        field.input.addEventListener("input", () => {
            if (field.input.getAttribute("aria-invalid") === "true") {
                validateField(field);
            }
        });
    });
    password.addEventListener("input", () => {
        if (passwordConfirm.getAttribute("aria-invalid") === "true") {
            validateField(fields[3]);
        }
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
        showFeedback("¡Cuenta creada! Revisa tu correo para confirmarla.", true);
        form.reset();
        fields.forEach((field) => showFieldError(field, ""));
    });
});
