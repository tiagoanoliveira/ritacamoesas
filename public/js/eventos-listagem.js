// public/js/eventos-listagem.js
// Lógica da página de listagem de eventos (US11): filtros, pesquisa e paginação.

const grid = document.getElementById("grid-eventos");
const paginacaoEl = document.getElementById("paginacao");
const selectTematica = document.getElementById("filtro-tematica");
const inputPesquisa = document.getElementById("filtro-pesquisa");
const botoesToggle = document.querySelectorAll(".filtro-toggle");
const template = document.getElementById("template-cartao-evento");

const estado = {
  periodo: "futuros",
  tematica: "",
  pesquisa: "",
  pagina: 1,
  limite: 9,
};

let debounceId = null;

function formatarPreco(centimos) {
  return (centimos / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    weekday: "short", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function carregarEventos() {
  grid.setAttribute("aria-busy", "true");
  const params = new URLSearchParams();
  params.set(estado.periodo, "1");
  if (estado.tematica) params.set("tematica", estado.tematica);
  if (estado.pesquisa) params.set("pesquisa", estado.pesquisa);
  params.set("pagina", estado.pagina);
  params.set("limite", estado.limite);

  try {
    const resposta = await fetch(`/api/eventos?${params.toString()}`);
    const dados = await resposta.json();
    renderizarEventos(dados.eventos);
    renderizarPaginacao(dados.eventos.length);
  } catch (erro) {
    grid.innerHTML = `<p class="estado-vazio">Não foi possível carregar os eventos. Tente novamente mais tarde.</p>`;
  } finally {
    grid.setAttribute("aria-busy", "false");
  }
}

function renderizarEventos(eventos) {
  grid.innerHTML = "";
  if (!eventos.length) {
    grid.innerHTML = `<p class="estado-vazio">Não há eventos ${estado.periodo === "futuros" ? "agendados" : "encontrados"} com estes filtros.</p>`;
    return;
  }

  for (const evento of eventos) {
    const clone = template.content.cloneNode(true);
    const link = clone.querySelector(".cartao-evento-link");
    const img = clone.querySelector("img");
    const etiqueta = clone.querySelector(".etiqueta-tematica");

    link.href = `/eventos/detalhe.html?slug=${evento.slug}`;
    img.src = evento.imagem_capa || "/images/placeholder-evento.jpg";
    img.alt = evento.titulo;
    if (evento.tematica) etiqueta.textContent = evento.tematica; else etiqueta.remove();

    clone.querySelector(".cartao-evento-titulo").textContent = evento.titulo;
    clone.querySelector(".cartao-evento-data").textContent = formatarData(evento.data_evento);
    clone.querySelector(".cartao-evento-local").textContent = evento.localizacao;
    clone.querySelector(".cartao-evento-preco").textContent = formatarPreco(evento.preco_centimos);

    const vagasEl = clone.querySelector(".cartao-evento-vagas");
    if (evento.vagas_disponiveis <= 0) {
      vagasEl.textContent = "Esgotado";
      vagasEl.classList.add("vagas-esgotadas");
    } else if (evento.vagas_disponiveis <= 3) {
      vagasEl.textContent = `Últimas ${evento.vagas_disponiveis} vagas`;
      vagasEl.classList.add("vagas-poucas");
    } else {
      vagasEl.textContent = `${evento.vagas_disponiveis} vagas disponíveis`;
    }

    grid.appendChild(clone);
  }
}

function renderizarPaginacao(totalNaPagina) {
  paginacaoEl.innerHTML = "";
  const botaoAnterior = document.createElement("button");
  botaoAnterior.textContent = "← Anterior";
  botaoAnterior.disabled = estado.pagina <= 1;
  botaoAnterior.addEventListener("click", () => { estado.pagina--; carregarEventos(); });

  const botaoSeguinte = document.createElement("button");
  botaoSeguinte.textContent = "Seguinte →";
  botaoSeguinte.disabled = totalNaPagina < estado.limite;
  botaoSeguinte.addEventListener("click", () => { estado.pagina++; carregarEventos(); });

  paginacaoEl.append(botaoAnterior, botaoSeguinte);
}

botoesToggle.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesToggle.forEach((b) => { b.classList.remove("ativo"); b.setAttribute("aria-selected", "false"); });
    botao.classList.add("ativo");
    botao.setAttribute("aria-selected", "true");
    estado.periodo = botao.dataset.periodo;
    estado.pagina = 1;
    carregarEventos();
  });
});

selectTematica.addEventListener("change", () => {
  estado.tematica = selectTematica.value;
  estado.pagina = 1;
  carregarEventos();
});

inputPesquisa.addEventListener("input", () => {
  clearTimeout(debounceId);
  debounceId = setTimeout(() => {
    estado.pesquisa = inputPesquisa.value.trim();
    estado.pagina = 1;
    carregarEventos();
  }, 350);
});

carregarEventos();