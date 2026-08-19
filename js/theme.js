"use strict";
function isTheme(value) {
    return value === "light" || value === "dark";
}
function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}
function getCurrentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    return isTheme(attr) ? attr : getSystemTheme();
}
function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector(".theme-toggle");
    if (!toggle) {
        return;
    }
    const updateLabel = () => {
        const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
        const label = nextTheme === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
        toggle.setAttribute("aria-label", label);
    };
    updateLabel();
    toggle.addEventListener("click", () => {
        const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        updateLabel();
    });
    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
        try {
            if (!localStorage.getItem("theme")) {
                updateLabel();
            }
        }
        catch {
            updateLabel();
        }
    });
});
