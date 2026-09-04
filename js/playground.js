"use strict";
/*
  Comportamiento interactivo del playground de componentes
  (playground.html). Cubre solo los patrones que gestionan foco
  o temporización por sí mismos: Dialogs, Menús y Toasts.
  Alerts, Botones y Checkboxes/Radios no necesitan JS: su
  comportamiento lo cubre el HTML nativo del navegador.
*/
(function () {
    const TOAST_AUTO_DISMISS_MS = 5000;
    const TOAST_MAX_VISIBLE = 3;
    function setupDialogs() {
        const dialog = document.querySelector(".c-dialog");
        const trigger = document.getElementById("btn-eliminar-recurso");
        if (!dialog || !(trigger instanceof HTMLButtonElement)) {
            return;
        }
        const cancelButton = dialog.querySelector("[data-dialog-cancel]");
        const confirmButton = dialog.querySelector("[data-dialog-confirm]");
        let openedBy = null;
        const openDialog = () => {
            openedBy = trigger;
            dialog.showModal();
        };
        const closeDialog = () => {
            if (dialog.open) {
                dialog.close();
            }
        };
        dialog.addEventListener("close", () => {
            openedBy?.focus();
            openedBy = null;
        });
        trigger.addEventListener("click", openDialog);
        cancelButton?.addEventListener("click", closeDialog);
        confirmButton?.addEventListener("click", closeDialog);
    }
    function collectMenuWidgets() {
        const toggles = document.querySelectorAll(".c-menu-account-toggle");
        const widgets = [];
        toggles.forEach((toggle) => {
            const menuId = toggle.getAttribute("aria-controls");
            const menu = menuId ? document.getElementById(menuId) : null;
            if (menu instanceof HTMLUListElement) {
                widgets.push({ toggle, menu });
            }
        });
        return widgets;
    }
    function setupMenus() {
        const widgets = collectMenuWidgets();
        if (widgets.length === 0) {
            return;
        }
        const isOpen = (widget) => !widget.menu.hidden;
        const closeMenu = (widget, focusToggle) => {
            widget.menu.hidden = true;
            widget.toggle.setAttribute("aria-expanded", "false");
            if (focusToggle) {
                widget.toggle.focus();
            }
        };
        const closeAllExcept = (except) => {
            widgets.forEach((widget) => {
                if (widget !== except && isOpen(widget)) {
                    closeMenu(widget, false);
                }
            });
        };
        const openMenu = (widget) => {
            closeAllExcept(widget);
            widget.menu.hidden = false;
            widget.toggle.setAttribute("aria-expanded", "true");
        };
        widgets.forEach((widget) => {
            widget.toggle.addEventListener("click", () => {
                if (isOpen(widget)) {
                    closeMenu(widget, false);
                }
                else {
                    openMenu(widget);
                }
            });
        });
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }
            const openWidget = widgets.find(isOpen);
            if (openWidget) {
                closeMenu(openWidget, true);
            }
        });
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }
            widgets.forEach((widget) => {
                if (!isOpen(widget)) {
                    return;
                }
                const clickedInside = widget.toggle.contains(target) || widget.menu.contains(target);
                if (!clickedInside) {
                    closeMenu(widget, false);
                }
            });
        });
    }
    function enforceMaxToasts(container) {
        const toasts = container.querySelectorAll(".c-toast");
        if (toasts.length <= TOAST_MAX_VISIBLE) {
            return;
        }
        const excess = toasts.length - TOAST_MAX_VISIBLE;
        for (let i = 0; i < excess; i++) {
            toasts[i]?.remove();
        }
    }
    function scheduleAutoDismiss(toast) {
        window.setTimeout(() => {
            toast.remove();
        }, TOAST_AUTO_DISMISS_MS);
    }
    function setupToasts() {
        const container = document.querySelector(".c-toast-container");
        if (!container) {
            return;
        }
        enforceMaxToasts(container);
        container
            .querySelectorAll(".c-toast")
            .forEach(scheduleAutoDismiss);
    }
    document.addEventListener("DOMContentLoaded", () => {
        setupDialogs();
        setupMenus();
        setupToasts();
    });
})();
