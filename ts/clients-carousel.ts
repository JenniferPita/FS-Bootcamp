/*
  Hace arrastrable el carrusel de "Nuestros clientes" (index.html).
  En vez de reimplementar el desplazamiento continuo con JS, toma la
  animación CSS que ya existe (clients-scroll, ver components.css) vía
  element.getAnimations() y controla su currentTime directamente: al
  arrastrar (mouse o touch) o mover el foco con las flechas, se pausa
  y se "rebobina" según el gesto; al soltar el clic o alejar el mouse
  retoma el auto-scroll de inmediato, exactamente desde donde quedó,
  sin saltos ni demoras.
*/

(function (): void {
  const KEYBOARD_STEP_FRACTION = 1 / 6; // una empresa de las 6 del grupo

  function setupClientsCarousel(): void {
    const banner = document.querySelector<HTMLElement>(".clients-banner");
    const track = banner?.querySelector<HTMLElement>(".clients-track");

    if (!banner || !track) {
      return;
    }

    let dragging = false;
    let dragPointerId: number | null = null;
    let dragStartX = 0;
    let dragStartTime = 0;

    const getAnim = (): Animation | undefined => track.getAnimations()[0];

    const getDurationMs = (anim: Animation): number => {
      const duration = anim.effect?.getTiming().duration;
      return typeof duration === "number" ? duration : 0;
    };

    const getGroupWidthPx = (): number => track.scrollWidth / 2;

    const wrapTime = (time: number, durationMs: number): number => {
      if (durationMs <= 0) {
        return 0;
      }
      return ((time % durationMs) + durationMs) % durationMs;
    };

    const pauseNow = (): void => {
      getAnim()?.pause();
    };

    const resumeNow = (): void => {
      getAnim()?.play();
    };

    const nudge = (fractionOfGroup: number): void => {
      const anim = getAnim();
      if (!anim) {
        return;
      }
      const durationMs = getDurationMs(anim);
      const currentTime = typeof anim.currentTime === "number" ? anim.currentTime : 0;
      anim.currentTime = wrapTime(currentTime + fractionOfGroup * durationMs, durationMs);
    };

    banner.addEventListener("pointerenter", () => {
      pauseNow();
    });

    banner.addEventListener("pointerleave", () => {
      if (!dragging) {
        resumeNow();
      }
    });

    banner.addEventListener("focusin", () => {
      pauseNow();
    });

    banner.addEventListener("focusout", () => {
      if (!dragging) {
        resumeNow();
      }
    });

    banner.addEventListener("pointerdown", (event: PointerEvent) => {
      const anim = getAnim();
      if (!anim) {
        return;
      }

      dragging = true;
      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartTime = typeof anim.currentTime === "number" ? anim.currentTime : 0;
      banner.classList.add("is-dragging");
      banner.setPointerCapture(event.pointerId);
      pauseNow();
    });

    banner.addEventListener("pointermove", (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragPointerId) {
        return;
      }

      const anim = getAnim();
      if (!anim) {
        return;
      }

      const durationMs = getDurationMs(anim);
      const groupWidthPx = getGroupWidthPx();
      if (durationMs <= 0 || groupWidthPx <= 0) {
        return;
      }

      const deltaX = event.clientX - dragStartX;
      const msPerPx = durationMs / groupWidthPx;
      anim.currentTime = wrapTime(dragStartTime - deltaX * msPerPx, durationMs);
    });

    const endDrag = (event: PointerEvent): void => {
      if (!dragging || event.pointerId !== dragPointerId) {
        return;
      }

      dragging = false;
      dragPointerId = null;
      banner.classList.remove("is-dragging");
      resumeNow();
    };

    banner.addEventListener("pointerup", endDrag);
    banner.addEventListener("pointercancel", endDrag);

    banner.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      nudge(event.key === "ArrowRight" ? KEYBOARD_STEP_FRACTION : -KEYBOARD_STEP_FRACTION);
    });
  }

  document.addEventListener("DOMContentLoaded", setupClientsCarousel);
})();
