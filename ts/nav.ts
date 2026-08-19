const DESKTOP_QUERY = "(min-width: 901px)";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const nav = document.getElementById("main-nav");
  const overlay = document.querySelector<HTMLElement>(".nav-overlay");

  if (!toggle || !nav || !overlay) {
    return;
  }

  const desktopQuery = window.matchMedia(DESKTOP_QUERY);

  const setOpen = (isOpen: boolean): void => {
    document.body.classList.toggle("nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"
    );
    nav.inert = !desktopQuery.matches && !isOpen;
  };

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("nav-open"));
  });

  overlay.addEventListener("click", () => setOpen(false));

  nav.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  desktopQuery.addEventListener("change", () => setOpen(false));

  setOpen(false);
});
