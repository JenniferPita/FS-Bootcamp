/*
  Revela el título del hero de index.html letra por letra. El h1 expone
  su texto final vía aria-label (no se toca durante la animación); el
  <span> visible (.hero-title-text) arranca con el texto completo por
  si JS está deshabilitado o prefers-reduced-motion está activo, y este
  script lo envuelve en un <span> por carácter para poder animarlos con
  fade-in escalonado en vez de simplemente ir insertando texto.
*/

(function (): void {
  const CHAR_STAGGER_MS = 40;

  function setupHeroTypewriter(): void {
    const heroTitle = document.getElementById("hero-title");
    const textEl = heroTitle?.querySelector<HTMLElement>(".hero-title-text");

    if (!heroTitle || !textEl) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const fullText = textEl.textContent ?? "";
    if (!fullText) {
      return;
    }

    textEl.textContent = "";

    const charSpans = Array.from(fullText).map((char) => {
      const charSpan = document.createElement("span");
      charSpan.className = "hero-title-char";
      charSpan.textContent = char;
      textEl.appendChild(charSpan);
      return charSpan;
    });

    charSpans.forEach((charSpan, index) => {
      window.setTimeout(() => {
        charSpan.classList.add("is-visible");
      }, index * CHAR_STAGGER_MS);
    });
  }

  document.addEventListener("DOMContentLoaded", setupHeroTypewriter);
})();
