(() => {
  const botaoMenu = document.querySelector("[data-menu-button]");
  const navegacao = document.getElementById("navegacao-principal");

  if (!botaoMenu || !navegacao) return;

  const fecharMenu = ({ devolverFoco = false } = {}) => {
    botaoMenu.setAttribute("aria-expanded", "false");
    botaoMenu.setAttribute("aria-label", "Abrir menu");
    navegacao.classList.add("hidden");

    if (devolverFoco) {
      botaoMenu.focus();
    }
  };

  const abrirMenu = () => {
    botaoMenu.setAttribute("aria-expanded", "true");
    botaoMenu.setAttribute("aria-label", "Fechar menu");
    navegacao.classList.remove("hidden");
  };

  botaoMenu.addEventListener("click", () => {
    const estaAberto =
      botaoMenu.getAttribute("aria-expanded") === "true";

    if (estaAberto) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });

  navegacao.addEventListener("click", (evento) => {
    if (!evento.target.closest("a")) return;

    fecharMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;

    const estaAberto =
      botaoMenu.getAttribute("aria-expanded") === "true";

    if (estaAberto) {
      fecharMenu({ devolverFoco: true });
    }
  });

  document.addEventListener("click", (evento) => {
    const estaAberto =
      botaoMenu.getAttribute("aria-expanded") === "true";

    if (!estaAberto) return;
    if (botaoMenu.contains(evento.target)) return;
    if (navegacao.contains(evento.target)) return;

    fecharMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      fecharMenu();
    }
  });
})();