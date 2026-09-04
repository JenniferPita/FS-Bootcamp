/*
  Comportamiento interactivo del playground de componentes
  (playground.html). Cubre solo los patrones que gestionan foco
  o temporización por sí mismos: Dialogs, Menús y Toasts.
  Alerts, Botones y Checkboxes/Radios no necesitan JS: su
  comportamiento lo cubre el HTML nativo del navegador.
*/

(function (): void {
  const TOAST_AUTO_DISMISS_MS = 5000;
  const TOAST_MAX_VISIBLE = 3;

  function setupDialogs(): void {
    const dialog = document.querySelector<HTMLDialogElement>(".c-dialog");
    const trigger = document.getElementById("btn-eliminar-recurso");

    if (!dialog || !(trigger instanceof HTMLButtonElement)) {
      return;
    }

    const cancelButton = dialog.querySelector<HTMLButtonElement>(
      "[data-dialog-cancel]"
    );
    const confirmButton = dialog.querySelector<HTMLButtonElement>(
      "[data-dialog-confirm]"
    );

    let openedBy: HTMLElement | null = null;

    const openDialog = (): void => {
      openedBy = trigger;
      dialog.showModal();
    };

    const closeDialog = (): void => {
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

  interface MenuWidget {
    toggle: HTMLButtonElement;
    menu: HTMLUListElement;
  }

  function collectMenuWidgets(): MenuWidget[] {
    const toggles = document.querySelectorAll<HTMLButtonElement>(
      ".c-menu-account-toggle"
    );

    const widgets: MenuWidget[] = [];

    toggles.forEach((toggle) => {
      const menuId = toggle.getAttribute("aria-controls");
      const menu = menuId ? document.getElementById(menuId) : null;

      if (menu instanceof HTMLUListElement) {
        widgets.push({ toggle, menu });
      }
    });

    return widgets;
  }

  function setupMenus(): void {
    const widgets = collectMenuWidgets();

    if (widgets.length === 0) {
      return;
    }

    const isOpen = (widget: MenuWidget): boolean => !widget.menu.hidden;

    const closeMenu = (widget: MenuWidget, focusToggle: boolean): void => {
      widget.menu.hidden = true;
      widget.toggle.setAttribute("aria-expanded", "false");

      if (focusToggle) {
        widget.toggle.focus();
      }
    };

    const closeAllExcept = (except: MenuWidget | null): void => {
      widgets.forEach((widget) => {
        if (widget !== except && isOpen(widget)) {
          closeMenu(widget, false);
        }
      });
    };

    const openMenu = (widget: MenuWidget): void => {
      closeAllExcept(widget);
      widget.menu.hidden = false;
      widget.toggle.setAttribute("aria-expanded", "true");
    };

    widgets.forEach((widget) => {
      widget.toggle.addEventListener("click", () => {
        if (isOpen(widget)) {
          closeMenu(widget, false);
        } else {
          openMenu(widget);
        }
      });
    });

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const openWidget = widgets.find(isOpen);

      if (openWidget) {
        closeMenu(openWidget, true);
      }
    });

    document.addEventListener("click", (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      widgets.forEach((widget) => {
        if (!isOpen(widget)) {
          return;
        }

        const clickedInside =
          widget.toggle.contains(target) || widget.menu.contains(target);

        if (!clickedInside) {
          closeMenu(widget, false);
        }
      });
    });
  }

  function enforceMaxToasts(container: HTMLElement): void {
    const toasts = container.querySelectorAll<HTMLElement>(".c-toast");

    if (toasts.length <= TOAST_MAX_VISIBLE) {
      return;
    }

    const excess = toasts.length - TOAST_MAX_VISIBLE;

    for (let i = 0; i < excess; i++) {
      toasts[i]?.remove();
    }
  }

  function scheduleAutoDismiss(toast: HTMLElement): void {
    window.setTimeout(() => {
      toast.remove();
    }, TOAST_AUTO_DISMISS_MS);
  }

  function setupToasts(): void {
    const container = document.querySelector<HTMLElement>(
      ".c-toast-container"
    );

    if (!container) {
      return;
    }

    enforceMaxToasts(container);

    container
      .querySelectorAll<HTMLElement>(".c-toast")
      .forEach(scheduleAutoDismiss);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupDialogs();
    setupMenus();
    setupToasts();
  });
})();
