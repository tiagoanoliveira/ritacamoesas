(() => {
  const grid = document.getElementById("grid-eventos");

  const paginacao = document.getElementById(
    "paginacao",
  );

  const selectTematica = document.getElementById(
    "filtro-tematica",
  );

  const inputPesquisa = document.getElementById(
    "filtro-pesquisa",
  );

  const botoesPeriodo = document.querySelectorAll(
    ".filtro-toggle",
  );

  const template = document.getElementById(
    "template-cartao-evento",
  );

  if (
    !grid ||
    !paginacao ||
    !selectTematica ||
    !inputPesquisa ||
    !template
  ) {
    return;
  }

  const estado = {
    periodo: "futuros",
    tematica: "",
    pesquisa: "",
    pagina: 1,
    limite: 9,
  };

  const classeEstado =
    "col-span-full border-y border-dusty-taupe/15 py-12 text-center text-dusty-taupe/60";

  const classeBotaoPaginacao =
    "inline-flex min-h-11 items-center justify-center border border-dusty-taupe/20 px-5 py-2 text-sm font-bold text-dusty-taupe transition-colors hover:border-camel hover:text-camel active:bg-almond-silk disabled:cursor-not-allowed disabled:opacity-35";

  let debounceId = null;
  let controladorPedido = null;

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
      year: "numeric",
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
      "text-dry-sage",
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
    elemento.classList.add("text-dry-sage");
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
      const complemento =
        estado.periodo === "futuros"
          ? "agendados"
          : "encontrados";

      apresentarEstado(
        `Não há eventos ${complemento} com estes filtros.`,
      );

      return;
    }

    const fragmento = document.createDocumentFragment();

    eventos.forEach((evento) => {
      fragmento.appendChild(criarCartao(evento));
    });

    grid.appendChild(fragmento);
  }

  function criarBotaoPaginacao({
    texto,
    desativado,
    aoClicar,
  }) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.className = classeBotaoPaginacao;
    botao.disabled = desativado;

    botao.addEventListener("click", aoClicar);

    return botao;
  }

  function voltarAoInicioDaLista() {
    const movimentoReduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    grid.scrollIntoView({
      behavior: movimentoReduzido ? "auto" : "smooth",
      block: "start",
    });
  }

  function renderizarPaginacao(totalNaPagina) {
    paginacao.innerHTML = "";

    const botaoAnterior = criarBotaoPaginacao({
      texto: "← Anterior",
      desativado: estado.pagina <= 1,
      aoClicar: () => {
        if (estado.pagina <= 1) return;

        estado.pagina -= 1;
        carregarEventos();
        voltarAoInicioDaLista();
      },
    });

    const botaoSeguinte = criarBotaoPaginacao({
      texto: "Seguinte →",
      desativado: totalNaPagina < estado.limite,
      aoClicar: () => {
        if (totalNaPagina < estado.limite) return;

        estado.pagina += 1;
        carregarEventos();
        voltarAoInicioDaLista();
      },
    });

    paginacao.append(
      botaoAnterior,
      botaoSeguinte,
    );
  }

  function construirParametros() {
    const parametros = new URLSearchParams();

    parametros.set(estado.periodo, "1");
    parametros.set("pagina", String(estado.pagina));
    parametros.set("limite", String(estado.limite));

    if (estado.tematica) {
      parametros.set("tematica", estado.tematica);
    }

    if (estado.pesquisa) {
      parametros.set("pesquisa", estado.pesquisa);
    }

    return parametros;
  }

  async function carregarEventos() {
    if (controladorPedido) {
      controladorPedido.abort();
    }

    controladorPedido = new AbortController();

    grid.setAttribute("aria-busy", "true");
    paginacao.setAttribute("aria-busy", "true");

    try {
      const parametros = construirParametros();

      const resposta = await fetch(
        `/api/eventos?${parametros.toString()}`,
        {
          signal: controladorPedido.signal,
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

      const eventos = Array.isArray(dados.eventos)
        ? dados.eventos
        : [];

      renderizarEventos(eventos);
      renderizarPaginacao(eventos.length);
    } catch (erro) {
      if (erro.name === "AbortError") return;

      console.error(
        "Erro ao carregar os eventos:",
        erro,
      );

      apresentarEstado(
        "Não foi possível carregar os eventos. Tente novamente mais tarde.",
      );

      paginacao.innerHTML = "";
    } finally {
      grid.setAttribute("aria-busy", "false");
      paginacao.setAttribute("aria-busy", "false");
    }
  }

  botoesPeriodo.forEach((botao) => {
    botao.addEventListener("click", () => {
      const periodo = botao.dataset.periodo;

      if (
        periodo !== "futuros" &&
        periodo !== "passados"
      ) {
        return;
      }

      botoesPeriodo.forEach((outroBotao) => {
        outroBotao.setAttribute(
          "aria-selected",
          "false",
        );
      });

      botao.setAttribute("aria-selected", "true");

      estado.periodo = periodo;
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
    window.clearTimeout(debounceId);

    debounceId = window.setTimeout(() => {
      estado.pesquisa = inputPesquisa.value.trim();
      estado.pagina = 1;

      carregarEventos();
    }, 350);
  });

  carregarEventos();
})();