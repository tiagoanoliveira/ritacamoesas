// public/js/atelier-proximos-eventos.js
// Preenche a secção "Próximos eventos" na página do Atelier e na homepage
// (o elemento com id="grid-proximos-eventos" ou "preview-eventos" — ambos
// suportados, para reaproveitar este script nas duas páginas).

const grid = document.getElementById("grid-proximos-eventos") || document.getElementById("preview-eventos");
const template = document.getElementById("template-cartao-evento");

function formatarPreco(centimos) {
  return (centimos / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}
function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    weekday: "short", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

async function carregarProximosEventos() {
  if (!grid || !template) return;
  const limite = grid.dataset.limite || 3;

  try {
    const resposta = await fetch(`/api/eventos?futuros=1&limite=${limite}`);
    const dados = await resposta.json();
    renderizar(dados.eventos);
  } catch {
    grid.innerHTML = `<p class="estado-vazio">Não foi possível carregar os próximos eventos.</p>`;
  }
}

function renderizar(eventos) {
  grid.innerHTML = "";
  if (!eventos.length) {
    grid.innerHTML = `<p class="estado-vazio">Não há workshops agendados neste momento. Volte a consultar em breve.</p>`;
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

carregarProximosEventos();