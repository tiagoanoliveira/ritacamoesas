const botaoMenu = document.querySelector("[data-menu-button]");
const navegacao = document.getElementById("navegacao-principal");

if (botaoMenu && navegacao) {
  const fecharMenu = () => {
    botaoMenu.setAttribute("aria-expanded", "false");
    botaoMenu.setAttribute("aria-label", "Abrir menu");
    navegacao.classList.add("hidden");
  };

  const abrirMenu = () => {
    botaoMenu.setAttribute("aria-expanded", "true");
    botaoMenu.setAttribute("aria-label", "Fechar menu");
    navegacao.classList.remove("hidden");
  };

  botaoMenu.addEventListener("click", () => {
    const aberto = botaoMenu.getAttribute("aria-expanded") === "true";
    aberto ? fecharMenu() : abrirMenu();
  });

  navegacao.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) fecharMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharMenu();
  });

  document.addEventListener("click", (evento) => {
    const aberto = botaoMenu.getAttribute("aria-expanded") === "true";

    if (
      aberto &&
      !navegacao.contains(evento.target) &&
      !botaoMenu.contains(evento.target)
    ) {
      fecharMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) fecharMenu();
  });
}