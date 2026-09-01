// public/js/admin/admin-guard.js
// Incluir em TODAS as páginas do dashboard (exceto login.html).
// Verifica a sessão via /api/admin/auth/me e redireciona para o login se inválida.
// Expõe window.sessaoAdmin com o email autenticado, para uso nas páginas.

(async function protegerPagina() {
  try {
    const resposta = await fetch("/api/admin/auth/me", { credentials: "same-origin" });
    if (!resposta.ok) throw new Error("Sessão inválida");
    const dados = await resposta.json();
    window.sessaoAdmin = dados;
  } catch {
    window.location.href = "/admin/login.html";
  }
})();

async function terminarSessao() {
  await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" });
  window.location.href = "/admin/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-acao='logout']").forEach((botao) => {
    botao.addEventListener("click", terminarSessao);
  });
});