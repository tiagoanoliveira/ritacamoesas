const elementos = {
  adminNome:
    document.getElementById("admin-nome"),

  adminEmail:
    document.getElementById("admin-email"),

  logout:
    document.getElementById("botao-logout"),

  filtros:
    document.getElementById("form-filtros"),

  pesquisa:
    document.getElementById("filtro-pesquisa"),

  estado:
    document.getElementById("filtro-estado"),

  mensagem:
    document.getElementById("mensagem-pagina"),

  carregamento:
    document.getElementById("carregamento"),

  lista:
    document.getElementById("lista-orcamentos"),

  vazio:
    document.getElementById("estado-vazio"),

  total:
    document.getElementById("total-orcamentos"),

  paginacao:
    document.getElementById("paginacao"),

  anterior:
    document.getElementById("botao-anterior"),

  seguinte:
    document.getElementById("botao-seguinte"),

  textoPaginacao:
    document.getElementById("texto-paginacao"),

  dialogo:
    document.getElementById("dialogo-orcamento"),

  form:
    document.getElementById("form-orcamento"),

  fechar:
    document.getElementById("botao-fechar"),

  tituloDialogo:
    document.getElementById("titulo-dialogo"),

  detalhes:
    document.getElementById("detalhes-orcamento"),

  resposta:
    document.getElementById("resposta-admin"),

  informacaoResposta:
    document.getElementById("informacao-resposta"),

  mensagemDialogo:
    document.getElementById("mensagem-dialogo"),

  arquivar:
    document.getElementById("botao-arquivar"),

  marcarPendente:
    document.getElementById(
      "botao-marcar-pendente",
    ),

  guardarResposta:
    document.getElementById(
      "botao-guardar-resposta",
    ),
};

const estadoPagina = {
  pagina: 1,
  limite: 25,
  total: 0,
  totalPaginas: 1,
};

let orcamentoAtual = null;

inicializar();

async function inicializar() {
  registarEventos();

  try {
    const dados = await pedirJson(
      "/api/admin/auth/me",
    );

    elementos.adminNome.textContent =
      dados.admin?.nome ||
      "Área administrativa";

    elementos.adminEmail.textContent =
      dados.admin?.email || "";

    await carregarOrcamentos();
  } catch (error) {
    if (error.status !== 401) {
      mostrarMensagemPagina(
        error.message ||
          "Não foi possível iniciar a área de orçamentos.",
        "erro",
      );
    }
  }
}

function registarEventos() {
  elementos.filtros.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      estadoPagina.pagina = 1;
      await carregarOrcamentos();
    },
  );

  elementos.lista.addEventListener(
    "click",
    tratarAcaoLista,
  );

  elementos.anterior.addEventListener(
    "click",
    async () => {
      if (estadoPagina.pagina <= 1) return;

      estadoPagina.pagina -= 1;
      await carregarOrcamentos();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  );

  elementos.seguinte.addEventListener(
    "click",
    async () => {
      if (
        estadoPagina.pagina >=
        estadoPagina.totalPaginas
      ) {
        return;
      }

      estadoPagina.pagina += 1;
      await carregarOrcamentos();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  );

  elementos.fechar.addEventListener(
    "click",
    fecharDialogo,
  );

  elementos.dialogo.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      fecharDialogo();
    },
  );

  elementos.dialogo.addEventListener(
    "click",
    (event) => {
      if (event.target === elementos.dialogo) {
        fecharDialogo();
      }
    },
  );

  elementos.form.addEventListener(
    "submit",
    guardarResposta,
  );

  elementos.arquivar.addEventListener(
    "click",
    () => atualizarOrcamento("arquivado"),
  );

  elementos.marcarPendente.addEventListener(
    "click",
    () => atualizarOrcamento("pendente"),
  );

  elementos.logout.addEventListener(
    "click",
    terminarSessao,
  );
}

async function carregarOrcamentos() {
  elementos.carregamento.hidden = false;
  elementos.lista.hidden = true;
  elementos.vazio.hidden = true;
  esconderMensagemPagina();

  const params = new URLSearchParams({
    pagina: String(estadoPagina.pagina),
    limite: String(estadoPagina.limite),
  });

  const pesquisa = elementos.pesquisa.value.trim();
  const estado = elementos.estado.value;

  if (pesquisa) {
    params.set("q", pesquisa);
  }

  if (estado) {
    params.set("estado", estado);
  }

  try {
    const dados = await pedirJson(
      `/api/admin/orcamentos?${params.toString()}`,
    );

    estadoPagina.total =
      dados.paginacao?.total || 0;

    estadoPagina.totalPaginas =
      dados.paginacao?.total_paginas || 1;

    estadoPagina.pagina =
      dados.paginacao?.pagina || 1;

    renderizarOrcamentos(
      dados.orcamentos || [],
    );
  } catch (error) {
    mostrarMensagemPagina(
      error.message ||
        "Não foi possível carregar os pedidos.",
      "erro",
    );
  } finally {
    elementos.carregamento.hidden = true;
  }
}

function renderizarOrcamentos(orcamentos) {
  elementos.lista.replaceChildren();

  elementos.total.textContent =
    estadoPagina.total === 1
      ? "1 pedido"
      : `${estadoPagina.total} pedidos`;

  if (!orcamentos.length) {
    elementos.vazio.hidden = false;
    elementos.lista.hidden = true;
    elementos.paginacao.hidden = true;
    return;
  }

  const fragmento = document.createDocumentFragment();

  orcamentos.forEach((orcamento) => {
    fragmento.append(
      criarCartaoOrcamento(orcamento),
    );
  });

  elementos.lista.append(fragmento);
  elementos.lista.hidden = false;
  elementos.vazio.hidden = true;

  atualizarPaginacao();
}

function criarCartaoOrcamento(orcamento) {
  const artigo = document.createElement("article");

  artigo.className =
    "border border-ink/15 bg-paper p-5 shadow-soft";

  const topo = document.createElement("div");

  topo.className =
    "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between";

  const dados = document.createElement("div");

  const nome = document.createElement("h3");

  nome.className =
    "font-display text-2xl font-semibold leading-tight";

  nome.textContent = orcamento.nome;

  const tipo = document.createElement("p");

  tipo.className =
    "mt-2 text-sm font-semibold text-ink/70";

  tipo.textContent =
    orcamento.tipo_evento ||
    "Evento por definir";

  dados.append(nome, tipo);

  const badge = document.createElement("span");

  badge.className =
    "w-fit px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em]";

  aplicarEstado(
    badge,
    orcamento.estado,
  );

  topo.append(dados, badge);

  const resumo = document.createElement("dl");

  resumo.className =
    "mt-5 grid gap-x-6 gap-y-4 border-y border-ink/10 py-5 text-sm sm:grid-cols-2 xl:grid-cols-4";

  adicionarDetalhe(
    resumo,
    "Pessoas",
    `${orcamento.num_pessoas} pessoa(s)`,
  );

  adicionarDetalhe(
    resumo,
    "Data pretendida",
    formatarData(
      orcamento.data_pretendida,
    ),
  );

  adicionarDetalhe(
    resumo,
    "Temática",
    orcamento.tematica || "—",
  );

  adicionarDetalhe(
    resumo,
    "Recebido em",
    formatarData(orcamento.criado_em),
  );

  const acoes = document.createElement("div");

  acoes.className = "mt-5";

  const abrir = document.createElement("button");

  abrir.type = "button";
  abrir.dataset.id = String(orcamento.id);

  abrir.className =
    "inline-flex min-h-11 items-center justify-center bg-ink px-5 text-sm font-extrabold text-cream hover:bg-amber";

  abrir.textContent = "Ver e gerir pedido";

  acoes.append(abrir);

  artigo.append(topo, resumo, acoes);

  return artigo;
}

function adicionarDetalhe(
  lista,
  rotulo,
  valor,
) {
  const item = document.createElement("div");

  const titulo = document.createElement("dt");

  titulo.className = "text-xs text-ink/50";
  titulo.textContent = rotulo;

  const texto = document.createElement("dd");

  texto.className =
    "mt-1 break-words font-semibold text-ink";

  texto.textContent = valor || "—";

  item.append(titulo, texto);
  lista.append(item);
}

async function tratarAcaoLista(event) {
  const botao = event.target.closest(
    "button[data-id]",
  );

  if (!botao) return;

  const id = Number(botao.dataset.id);

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  botao.disabled = true;

  try {
    const dados = await pedirJson(
      `/api/admin/orcamentos/${id}`,
    );

    abrirDialogo(dados.orcamento);
  } catch (error) {
    mostrarMensagemPagina(
      error.message ||
        "Não foi possível abrir o pedido.",
      "erro",
    );
  } finally {
    botao.disabled = false;
  }
}

function abrirDialogo(orcamento) {
  orcamentoAtual = orcamento;

  elementos.tituloDialogo.textContent =
    orcamento.nome;

  elementos.detalhes.replaceChildren();

  adicionarDetalhe(
    elementos.detalhes,
    "Nome",
    orcamento.nome,
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Email",
    orcamento.email,
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Telefone",
    orcamento.telefone,
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Tipo de evento",
    orcamento.tipo_evento,
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Número de pessoas",
    `${orcamento.num_pessoas} pessoa(s)`,
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Temática",
    orcamento.tematica || "—",
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Data pretendida",
    formatarData(orcamento.data_pretendida),
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Recebido em",
    formatarData(orcamento.criado_em),
  );

  adicionarDetalhe(
    elementos.detalhes,
    "Observações",
    orcamento.observacoes || "—",
  );

  elementos.resposta.value =
    orcamento.resposta_admin || "";

  elementos.informacaoResposta.textContent =
    orcamento.respondido_em
      ? `Última resposta: ${formatarData(
          orcamento.respondido_em,
        )}`
      : "Ainda sem resposta guardada.";

  esconderMensagemDialogo();

  elementos.arquivar.hidden =
    orcamento.estado === "arquivado";

  elementos.marcarPendente.hidden =
    orcamento.estado === "pendente";

  elementos.dialogo.showModal();
  elementos.resposta.focus();
}

async function guardarResposta(event) {
  event.preventDefault();

  if (!orcamentoAtual) return;

  const resposta =
    elementos.resposta.value.trim();

  if (!resposta) {
    mostrarMensagemDialogo(
      "Escreve uma resposta antes de guardar.",
      "erro",
    );
    return;
  }

  await atualizarOrcamento(
    "respondido",
    resposta,
  );
}

async function atualizarOrcamento(
  estado,
  respostaAdmin = elementos.resposta.value.trim(),
) {
  if (!orcamentoAtual) return;

  const mensagens = {
    pendente:
      "Voltar a marcar este pedido como pendente? A resposta guardada será removida.",

    arquivado:
      "Arquivar este pedido? O histórico será preservado.",

    respondido:
      "Guardar esta resposta e marcar o pedido como respondido?",
  };

  if (!window.confirm(mensagens[estado])) {
    return;
  }

  const botao =
    estado === "respondido"
      ? elementos.guardarResposta
      : estado === "arquivado"
        ? elementos.arquivar
        : elementos.marcarPendente;

  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "A guardar…";

  try {
    const dados = await pedirJson(
      `/api/admin/orcamentos/${orcamentoAtual.id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          estado,
          resposta_admin: respostaAdmin,
        }),
      },
    );

    orcamentoAtual = dados.orcamento;

    fecharDialogo();

    mostrarMensagemPagina(
      estado === "respondido"
        ? "Resposta guardada e pedido marcado como respondido."
        : estado === "arquivado"
          ? "Pedido arquivado sem apagar o histórico."
          : "Pedido marcado novamente como pendente.",
      "sucesso",
    );

    await carregarOrcamentos();
  } catch (error) {
    mostrarMensagemDialogo(
      error.message ||
        "Não foi possível atualizar o pedido.",
      "erro",
    );

    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

function fecharDialogo() {
  if (elementos.dialogo.open) {
    elementos.dialogo.close();
  }

  orcamentoAtual = null;
  elementos.form.reset();
  elementos.detalhes.replaceChildren();
  esconderMensagemDialogo();
}

function atualizarPaginacao() {
  elementos.paginacao.hidden = false;

  elementos.anterior.disabled =
    estadoPagina.pagina <= 1;

  elementos.seguinte.disabled =
    estadoPagina.pagina >=
    estadoPagina.totalPaginas;

  elementos.textoPaginacao.textContent =
    `Página ${estadoPagina.pagina} de ${estadoPagina.totalPaginas}`;
}

function aplicarEstado(elemento, estado) {
  const configuracao = {
    pendente: {
      texto: "Pendente",
      classes: "bg-warning/10 text-warning",
    },

    respondido: {
      texto: "Respondido",
      classes: "bg-success/10 text-success",
    },

    arquivado: {
      texto: "Arquivado",
      classes: "bg-ink/10 text-ink/60",
    },
  };

  const atual =
    configuracao[estado] ||
    configuracao.pendente;

  elemento.textContent = atual.texto;
  elemento.className += ` ${atual.classes}`;
}

function formatarData(valor) {
  if (!valor) return "Não indicada";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Não indicada";
  }

  return data.toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function terminarSessao() {
  elementos.logout.disabled = true;

  try {
    await fetch(
      "/api/admin/auth/logout",
      {
        method: "POST",
        credentials: "same-origin",
      },
    );
  } finally {
    window.location.replace(
      "/admin/login.html",
    );
  }
}

async function pedirJson(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: "same-origin",
    ...opcoes,
  });

  const contentType =
    resposta.headers.get("Content-Type") || "";

  const dados = contentType.includes(
    "application/json",
  )
    ? await resposta.json()
    : {};

  if (resposta.status === 401) {
    window.location.replace(
      "/admin/login.html",
    );

    const erro = new Error(
      "Sessão expirada.",
    );

    erro.status = 401;
    throw erro;
  }

  if (!resposta.ok) {
    const erro = new Error(
      dados.erro ||
        "O pedido não foi concluído.",
    );

    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

function mostrarMensagemPagina(mensagem, tipo) {
  elementos.mensagem.textContent = mensagem;

  elementos.mensagem.className =
    tipo === "sucesso"
      ? "mt-6 border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
      : "mt-6 border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger";

  elementos.mensagem.hidden = false;
  elementos.mensagem.focus();
}

function esconderMensagemPagina() {
  elementos.mensagem.hidden = true;
  elementos.mensagem.textContent = "";
}

function mostrarMensagemDialogo(
  mensagem,
  tipo,
) {
  elementos.mensagemDialogo.textContent = mensagem;

  elementos.mensagemDialogo.className =
    tipo === "sucesso"
      ? "border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
      : "border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger";

  elementos.mensagemDialogo.hidden = false;
  elementos.mensagemDialogo.focus();
}

function esconderMensagemDialogo() {
  elementos.mensagemDialogo.hidden = true;
  elementos.mensagemDialogo.textContent = "";
}