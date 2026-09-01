// public/js/orcamento.js
// Submissão do formulário de pedido de orçamento (US14).

const form = document.getElementById("form-orcamento");
const resultadoEl = document.getElementById("resultado-orcamento");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  botao.textContent = "A enviar…";

  const dados = new FormData(form);
  const payload = {
    nome: dados.get("nome"),
    email: dados.get("email"),
    telefone: dados.get("telefone"),
    tipo_evento: dados.get("tipo_evento"),
    num_pessoas: Number(dados.get("num_pessoas")),
    tematica: dados.get("tematica"),
    data_pretendida: dados.get("data_pretendida"),
    observacoes: dados.get("observacoes"),
    turnstile_token: dados.get("cf-turnstile-response"),
  };

  try {
    const resposta = await fetch("/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      exibir(resultado.erro || "Não foi possível enviar o pedido.", "erro");
    } else {
      form.hidden = true;
      exibir(
        "Pedido enviado com sucesso! A Rita irá analisar o seu pedido e responder por email brevemente.",
        "sucesso"
      );
    }
  } catch {
    exibir("Erro de ligação. Tente novamente.", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar pedido de orçamento";
  }
});

function exibir(mensagem, tipo) {
  resultadoEl.hidden = false;
  resultadoEl.className = `resultado-reserva resultado-${tipo}`;
  resultadoEl.textContent = mensagem;
}