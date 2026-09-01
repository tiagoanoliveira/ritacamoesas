// public/js/evento-detalhe.js
// Lógica da página de detalhe de evento + submissão de reserva (US12, RN02, RN04, RN05).

const slug = new URLSearchParams(window.location.search).get("slug");

const el = {
  carregando: document.getElementById("estado-carregando"),
  erro: document.getElementById("estado-erro"),
  conteudo: document.getElementById("conteudo-evento"),
  tematica: document.getElementById("evento-tematica"),
  titulo: document.getElementById("evento-titulo"),
  data: document.getElementById("evento-data"),
  duracao: document.getElementById("evento-duracao"),
  local: document.getElementById("evento-local"),
  descricao: document.getElementById("evento-descricao"),
  preco: document.getElementById("evento-preco"),
  vagas: document.getElementById("evento-vagas"),
  avisoFechado: document.getElementById("aviso-reservas-fechadas"),
  form: document.getElementById("form-reserva"),
  eventoIdInput: document.getElementById("evento_id"),
  numPessoas: document.getElementById("num_pessoas"),
  resultado: document.getElementById("resultado-reserva"),
  galeriaAtual: document.getElementById("galeria-imagem-atual"),
  galeriaMiniaturas: document.getElementById("galeria-miniaturas"),
  tituloPagina: document.getElementById("titulo-pagina"),
};

function formatarPreco(centimos) {
  return (centimos / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}
function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function carregarEvento() {
  if (!slug) return mostrarErro();
  try {
    const resposta = await fetch(`/api/eventos/${slug}`);
    if (!resposta.ok) return mostrarErro();
    const evento = await resposta.json();
    renderizarEvento(evento);
  } catch {
    mostrarErro();
  }
}

function mostrarErro() {
  el.carregando.hidden = true;
  el.erro.hidden = false;
}

function renderizarEvento(evento) {
  el.carregando.hidden = true;
  el.conteudo.hidden = false;
  el.tituloPagina.textContent = `${evento.titulo} | Atelier by Rita`;

  if (evento.tematica) el.tematica.textContent = evento.tematica; else el.tematica.remove();
  el.titulo.textContent = evento.titulo;
  el.data.textContent = `📅 ${formatarData(evento.data_evento)}`;
  el.duracao.textContent = `⏱ Duração aproximada: ${evento.duracao_minutos} minutos`;
  el.local.textContent = `📍 ${evento.localizacao}`;
  el.descricao.innerHTML = evento.descricao.replace(/\n/g, "<br>"); // descrição vem de campo de texto controlado pelo admin
  el.preco.textContent = formatarPreco(evento.preco_centimos);
  el.eventoIdInput.value = evento.id;
  el.numPessoas.max = evento.vagas_disponiveis;

  if (evento.vagas_disponiveis <= 0) {
    el.vagas.textContent = "Esgotado";
    el.vagas.classList.add("vagas-esgotadas");
    el.form.querySelector("button[type=submit]").disabled = true;
  } else if (evento.vagas_disponiveis <= 3) {
    el.vagas.textContent = `Últimas ${evento.vagas_disponiveis} vagas`;
    el.vagas.classList.add("vagas-poucas");
  } else {
    el.vagas.textContent = `${evento.vagas_disponiveis} vagas disponíveis`;
  }

  if (!evento.reservas_abertas || evento.vagas_disponiveis <= 0) {
    el.avisoFechado.hidden = evento.vagas_disponiveis > 0 ? false : evento.vagas_disponiveis <= 0;
    el.form.hidden = true;
  }

  renderizarGaleria(evento.imagens.length ? evento.imagens : [{ url: "/images/placeholder-evento.jpg", alt: evento.titulo }]);
}

function renderizarGaleria(imagens) {
  el.galeriaAtual.src = imagens[0].url;
  el.galeriaAtual.alt = imagens[0].alt || "";
  el.galeriaMiniaturas.innerHTML = "";
  imagens.forEach((img, i) => {
    const miniatura = document.createElement("button");
    miniatura.type = "button";
    miniatura.className = "galeria-miniatura" + (i === 0 ? " ativa" : "");
    miniatura.innerHTML = `<img src="${img.url}" alt="${img.alt || ""}" />`;
    miniatura.addEventListener("click", () => {
      el.galeriaAtual.src = img.url;
      el.galeriaAtual.alt = img.alt || "";
      el.galeriaMiniaturas.querySelectorAll(".galeria-miniatura").forEach((m) => m.classList.remove("ativa"));
      miniatura.classList.add("ativa");
    });
    el.galeriaMiniaturas.appendChild(miniatura);
  });
}

el.form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = el.form.querySelector("button[type=submit]");
  botao.disabled = true;
  botao.textContent = "A processar…";

  const dados = new FormData(el.form);
  const payload = {
    evento_id: Number(dados.get("evento_id")),
    nome: dados.get("nome"),
    email: dados.get("email"),
    telefone: dados.get("telefone"),
    num_pessoas: Number(dados.get("num_pessoas")),
    metodo_pagamento: dados.get("metodo_pagamento"),
    observacoes: dados.get("observacoes"),
    turnstile_token: dados.get("cf-turnstile-response"),
  };

  try {
    const resposta = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      exibirResultado(resultado.erro || "Não foi possível concluir a reserva.", "erro");
    } else {
      el.form.hidden = true;
      exibirResultado(
        `Reserva efetuada com sucesso! O seu código é <strong>${resultado.codigo}</strong>.
         Consulte o seu email para os dados de pagamento — tem até
         <strong>${new Date(resultado.prazo_pagamento).toLocaleString("pt-PT")}</strong> para concluir o pagamento.`,
        "sucesso"
      );
    }
  } catch {
    exibirResultado("Erro de ligação. Tente novamente.", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Confirmar reserva";
  }
});

function exibirResultado(mensagemHtml, tipo) {
  el.resultado.hidden = false;
  el.resultado.className = `resultado-reserva resultado-${tipo}`;
  el.resultado.innerHTML = mensagemHtml;
}

carregarEvento();
