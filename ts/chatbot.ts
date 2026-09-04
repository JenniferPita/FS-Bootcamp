/*
  Asistente de ayuda con respuestas predefinidas (sin backend, sin
  IA real). Las preguntas y respuestas viven en el HTML como
  atributos data-answer/data-link-href/data-link-text de cada
  .chatbot-question — este script abre/cierra el panel, muestra u
  oculta la burbuja de preguntas frecuentes bajo demanda, simula
  un breve "escribiendo..." antes de cada respuesta, y arma la
  conversación al hacer clic en una pregunta.
*/

(function (): void {
  const TYPING_DELAY_MS = 700;

  function createTypingIndicator(): HTMLElement {
    const typing = document.createElement("div");
    typing.className = "chatbot-typing";
    typing.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) {
      typing.appendChild(document.createElement("span"));
    }
    return typing;
  }

  function setupChatbot(): void {
    const toggle = document.getElementById("chatbot-toggle");
    const panel = document.getElementById("chatbot-panel");
    const transcript = document.getElementById("chatbot-transcript");
    const closeButton = panel?.querySelector<HTMLButtonElement>(
      ".chatbot-panel-close"
    );
    const faqToggle = document.getElementById("chatbot-faq-toggle");
    const bubble = document.getElementById("chatbot-questions");
    const bubbleCloseButton = bubble?.querySelector<HTMLButtonElement>(
      ".chatbot-questions-bubble-close"
    );
    const questionButtons = bubble?.querySelectorAll<HTMLButtonElement>(
      ".chatbot-question"
    );

    if (
      !(toggle instanceof HTMLButtonElement) ||
      !panel ||
      !(transcript instanceof HTMLElement) ||
      !(closeButton instanceof HTMLButtonElement) ||
      !(faqToggle instanceof HTMLButtonElement) ||
      !bubble ||
      !(bubbleCloseButton instanceof HTMLButtonElement) ||
      !questionButtons ||
      questionButtons.length === 0
    ) {
      return;
    }

    const chatTranscript: HTMLElement = transcript;
    const chatPanel: HTMLElement = panel;
    const faqBubble: HTMLElement = bubble;

    const isOpen = (): boolean => !chatPanel.hidden;

    const closePanel = (focusToggle: boolean): void => {
      chatPanel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir asistente de ayuda");
      if (focusToggle) {
        toggle.focus();
      }
    };

    const openPanel = (): void => {
      chatPanel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Cerrar asistente de ayuda");
      faqToggle.focus();
    };

    const isFaqOpen = (): boolean => faqBubble.classList.contains("is-open");

    const closeFaq = (focusToggle: boolean): void => {
      faqBubble.classList.remove("is-open");
      faqToggle.setAttribute("aria-expanded", "false");
      faqToggle.textContent = "Preguntas frecuentes";
      if (focusToggle) {
        faqToggle.focus();
      }
    };

    const openFaq = (): void => {
      faqBubble.classList.add("is-open");
      faqToggle.setAttribute("aria-expanded", "true");
      faqToggle.textContent = "Ocultar preguntas";
      questionButtons[0]?.focus();
    };

    const scrollTranscriptToEnd = (): void => {
      const body = chatPanel.querySelector<HTMLElement>(".chatbot-panel-body");
      body?.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    };

    const appendMessage = (text: string, from: "user" | "bot"): void => {
      const message = document.createElement("p");
      message.className = `chatbot-message chatbot-message-${from}`;
      message.textContent = text;
      chatTranscript.appendChild(message);
    };

    questionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        appendMessage(button.textContent?.trim() ?? "", "user");
        closeFaq(true);

        const typingIndicator = createTypingIndicator();
        chatTranscript.appendChild(typingIndicator);
        scrollTranscriptToEnd();

        window.setTimeout(() => {
          typingIndicator.remove();
          appendMessage(button.dataset.answer ?? "", "bot");

          const linkHref = button.dataset.linkHref;
          const linkText = button.dataset.linkText;
          if (linkHref && linkText) {
            const link = document.createElement("a");
            link.href = linkHref;
            link.className = "chatbot-message-link";
            link.textContent = linkText;
            chatTranscript.appendChild(link);
          }

          scrollTranscriptToEnd();
        }, TYPING_DELAY_MS);
      });
    });

    faqToggle.addEventListener("click", () => {
      if (isFaqOpen()) {
        closeFaq(false);
      } else {
        openFaq();
      }
    });

    bubbleCloseButton.addEventListener("click", () => closeFaq(true));

    toggle.addEventListener("click", () => {
      if (isOpen()) {
        closePanel(false);
      } else {
        openPanel();
      }
    });

    closeButton.addEventListener("click", () => closePanel(true));

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (isFaqOpen()) {
        closeFaq(true);
      } else if (isOpen()) {
        closePanel(true);
      }
    });

    document.addEventListener("click", (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !isOpen()) {
        return;
      }

      const clickedInside =
        toggle.contains(target) || chatPanel.contains(target);

      if (!clickedInside) {
        closePanel(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", setupChatbot);
})();
