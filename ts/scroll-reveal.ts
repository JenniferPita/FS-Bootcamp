/*
  Anima genéricamente cualquier elemento marcado con [data-reveal]
  (ver la regla en css/base.css) cuando entra en pantalla: agrega la
  clase is-visible vía IntersectionObserver, la propia transición
  CSS hace el fade + slide-up. Un elemento ya visible al cargar la
  página (por ejemplo el contenido del hero, sobre el pliegue) recibe
  la clase casi de inmediato, así que igual "aparece" con su
  animación en vez de empezar invisible.
*/

(function (): void {
  function setupScrollReveal(): void {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (targets.length === 0) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((target) => observer.observe(target));
  }

  document.addEventListener("DOMContentLoaded", setupScrollReveal);
})();
