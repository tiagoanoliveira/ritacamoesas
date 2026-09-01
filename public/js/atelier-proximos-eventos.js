(() => {
  const grid =
    document.getElementById("grid-proximos-eventos") ||
    document.getElementById("preview-eventos");

  const template = document.getElementById(
    "template-cartao-evento",
  );

  if (!grid || !template) return;

  const classeEstado =
    "col-span-full border-y border-ink/15 py-12 text-center text-ink/60";

  function formatarPreco(centimos) {
    const valor = Number(centimos);

    if (!Number.isFinite(valor)) {
      return "Preço sob consulta";
    }

    return (valor / 100).toLocaleString("pt-PT", {
      style: "currency",
      currency: "EUR",
    });
  }

  function formatarData(dataISO) {
    const data = new Date(dataISO);

    if (Number.isNaN(data.getTime())) {
      return "Data a anunciar";
    }

    return data.toLocaleString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function apresentarEstado(mensagem) {
    grid.innerHTML = "";

    const paragrafo = document.createElement("p");
    paragrafo.className = classeEstado;
    paragrafo.textContent = mensagem;

    grid.appendChild(paragrafo);
  }

  function configurarVagas(elemento, vagasDisponiveis) {
    const vagas = Number(vagasDisponiveis);

    elemento.classList.remove(
      "text-olive",
      "text-warning",
      "text-danger",
    );

    if (!Number.isFinite(vagas) || vagas <= 0) {
      elemento.textContent = "Esgotado";
      elemento.classList.add("text-danger");
      return;
    }

    if (vagas <= 3) {
      elemento.textContent =
        vagas === 1 ? "Última vaga" : `Últimas ${vagas} vagas`;

      elemento.classList.add("text-warning");
      return;
    }

    elemento.textContent = `${vagas} vagas disponíveis`;
    elemento.classList.add("text-olive");
  }

  function criarCartao(evento) {
    const fragmento = template.content.cloneNode(true);

    const link = fragmento.querySelector(
      ".cartao-evento-link",
    );

    const imagem = fragmento.querySelector("img");

    const etiqueta = fragmento.querySelector(
      ".etiqueta-tematica",
    );

    const titulo = fragmento.querySelector(
      ".cartao-evento-titulo",
    );

    const data = fragmento.querySelector(
      ".cartao-evento-data",
    );

    const local = fragmento.querySelector(
      ".cartao-evento-local",
    );

    const preco = fragmento.querySelector(
      ".cartao-evento-preco",
    );

    const vagas = fragmento.querySelector(
      ".cartao-evento-vagas",
    );

    link.href =
      `/eventos/detalhe.html?slug=${encodeURIComponent(evento.slug)}`;

    imagem.src =
      evento.imagem_capa || "/images/placeholder-evento.jpg";

    imagem.alt = evento.titulo || "Evento do Atelier by Rita";

    if (evento.tematica) {
      etiqueta.textContent = evento.tematica;
    } else {
      etiqueta.remove();
    }

    titulo.textContent = evento.titulo || "Evento";
    data.textContent = formatarData(evento.data_evento);
    local.textContent =
      evento.localizacao || "Atelier by Rita";

    preco.textContent = formatarPreco(
      evento.preco_centimos,
    );

    configurarVagas(
      vagas,
      evento.vagas_disponiveis,
    );

    return fragmento;
  }

  function renderizarEventos(eventos) {
    grid.innerHTML = "";

    if (!Array.isArray(eventos) || eventos.length === 0) {
      apresentarEstado(
        "Não há workshops agendados neste momento. Volte a consultar em breve.",
      );

      return;
    }

    const fragmento = document.createDocumentFragment();

    eventos.forEach((evento) => {
      fragmento.appendChild(criarCartao(evento));
    });

    grid.appendChild(fragmento);
  }

  async function carregarProximosEventos() {
    const limite = Number.parseInt(
      grid.dataset.limite || "3",
      10,
    );

    grid.setAttribute("aria-busy", "true");

    try {
      const parametros = new URLSearchParams({
        futuros: "1",
        limite: String(
          Number.isFinite(limite) ? limite : 3,
        ),
      });

      const resposta = await fetch(
        `/api/eventos?${parametros.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!resposta.ok) {
        throw new Error(
          `A API respondeu com o estado ${resposta.status}.`,
        );
      }

      const dados = await resposta.json();

      renderizarEventos(dados.eventos);
    } catch (erro) {
      console.error(
        "Erro ao carregar os próximos eventos:",
        erro,
      );

      apresentarEstado(
        "Não foi possível carregar os próximos eventos. Tente novamente mais tarde.",
      );
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  carregarProximosEventos();
})();