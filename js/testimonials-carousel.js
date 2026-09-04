"use strict";
/*
  Carrusel vertical de testimonios (index.html): un testimonio activo
  al centro, el anterior y el siguiente asoman arriba/abajo
  (desenfocados). El estado de cada slide (active/prev/next/hidden) se
  guarda en data-position y el CSS hace toda la animación a partir de
  ese atributo. Avanza solo cada cierto tiempo, se puede arrastrar
  verticalmente (mouse o touch) y hay flechas para cambiar a mano.
*/
(function () {
    const AUTO_ADVANCE_MS = 5000;
    const DRAG_SWIPE_THRESHOLD_PX = 40;
    function setupTestimonialsCarousel() {
        const carousel = document.querySelector(".testimonial-carousel");
        const viewport = carousel?.querySelector(".testimonial-viewport");
        const track = carousel?.querySelector(".testimonial-track");
        const slides = carousel
            ? Array.from(carousel.querySelectorAll(".testimonial-slide"))
            : [];
        const prevButton = carousel?.querySelector(".testimonial-nav-prev");
        const nextButton = carousel?.querySelector(".testimonial-nav-next");
        if (!carousel || !viewport || !track || slides.length === 0 || !prevButton || !nextButton) {
            return;
        }
        const count = slides.length;
        let activeIndex = 0;
        let autoTimer;
        const render = () => {
            slides.forEach((slide, index) => {
                const diff = (index - activeIndex + count) % count;
                let position;
                if (diff === 0) {
                    position = "active";
                }
                else if (diff === 1) {
                    position = "next";
                }
                else if (diff === count - 1) {
                    position = "prev";
                }
                else {
                    position = "hidden";
                }
                slide.dataset.position = position;
                slide.setAttribute("aria-hidden", position === "active" ? "false" : "true");
            });
        };
        const goTo = (index) => {
            activeIndex = ((index % count) + count) % count;
            render();
        };
        const next = () => goTo(activeIndex + 1);
        const prev = () => goTo(activeIndex - 1);
        const stopAuto = () => {
            window.clearInterval(autoTimer);
        };
        const startAuto = () => {
            stopAuto();
            if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return;
            }
            autoTimer = window.setInterval(next, AUTO_ADVANCE_MS);
        };
        prevButton.addEventListener("click", () => {
            prev();
            startAuto();
        });
        nextButton.addEventListener("click", () => {
            next();
            startAuto();
        });
        carousel.addEventListener("pointerenter", stopAuto);
        carousel.addEventListener("pointerleave", startAuto);
        carousel.addEventListener("focusin", stopAuto);
        carousel.addEventListener("focusout", startAuto);
        let dragging = false;
        let dragPointerId = null;
        let dragStartY = 0;
        viewport.addEventListener("pointerdown", (event) => {
            dragging = true;
            dragPointerId = event.pointerId;
            dragStartY = event.clientY;
            carousel.classList.add("is-dragging");
            viewport.setPointerCapture(event.pointerId);
            stopAuto();
        });
        viewport.addEventListener("pointermove", (event) => {
            if (!dragging || event.pointerId !== dragPointerId) {
                return;
            }
            const deltaY = event.clientY - dragStartY;
            track.style.setProperty("--drag-offset", `${deltaY}px`);
        });
        const endDrag = (event) => {
            if (!dragging || event.pointerId !== dragPointerId) {
                return;
            }
            dragging = false;
            dragPointerId = null;
            carousel.classList.remove("is-dragging");
            const deltaY = event.clientY - dragStartY;
            track.style.removeProperty("--drag-offset");
            if (deltaY > DRAG_SWIPE_THRESHOLD_PX) {
                prev();
            }
            else if (deltaY < -DRAG_SWIPE_THRESHOLD_PX) {
                next();
            }
            startAuto();
        };
        viewport.addEventListener("pointerup", endDrag);
        viewport.addEventListener("pointercancel", endDrag);
        render();
        startAuto();
    }
    document.addEventListener("DOMContentLoaded", setupTestimonialsCarousel);
})();
