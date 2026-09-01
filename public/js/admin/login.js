// public/js/admin/login.js
// Submissão do formulário de login do Admin.

const form = document.getElementById("form-login");
const erroEl = document.getElementById("erro-login");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroEl.hidden = true;
  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  botao.textContent = "A entrar…";

  const dados = new FormData(form);
  const payload = {
    email: dados.get("email"),
    password: dados.get("password"),
    turnstile_token: dados.get("cf-turnstile-response"),
  };

  try {
    const resposta = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      erroEl.textContent = resultado.erro || "Não foi possível entrar.";
      erroEl.hidden = false;
    } else {
      window.location.href = "/admin/dashboard.html";
    }
  } catch {
    erroEl.textContent = "Erro de ligação. Tente novamente.";
    erroEl.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});