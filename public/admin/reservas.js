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
    document.getElementById("lista-reservas"),

  vazio:
    document.getElementById("estado-vazio"),

  total:
    document.getElementById("total-reservas"),

  paginacao:
    document.getElementById("paginacao"),

  anterior:
    document.getElementById("botao-anterior"),

  seguinte:
    document.getElementById("botao-seguinte"),

  textoPaginacao:
    document.getElementById("texto-paginacao"),
};

const estadoPagina = {
  pagina: 1,
  limite: 25,
  total: 0,
  totalPaginas: 1,
};

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

    await carregarReservas();
  } catch (error) {
    if (error.status !== 401) {
      mostrarMensagem(
        error.message ||
          "Não foi possível iniciar a área de reservas.",
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
      await carregarReservas();
    },
  );

  elementos.lista.addEventListener(
    "click",
    tratarAcaoReserva,
  );

  elementos.anterior.addEventListener(
    "click",
    async () => {
      if (estadoPagina.pagina <= 1) return;

      estadoPagina.pagina -= 1;
      await carregarReservas();
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
      await carregarReservas();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  );

  elementos.logout.addEventListener(
    "click",
    terminarSessao,
  );
}

async function carregarReservas() {
  elementos.carregamento.hidden = false;
  elementos.lista.hidden = true;
  elementos.vazio.hidden = true;
  esconderMensagem();

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
      `/api/admin/reservas?${params.toString()}`,
    );

    estadoPagina.total =
      dados.paginacao?.total || 0;

    estadoPagina.totalPaginas =
      dados.paginacao?.total_paginas || 1;

    estadoPagina.pagina =
      dados.paginacao?.pagina || 1;

    renderizarReservas(
      dados.reservas || [],
    );
  } catch (error) {
    mostrarMensagem(
      error.message ||
        "Não foi possível carregar as reservas.",
      "erro",
    );
  } finally {
    elementos.carregamento.hidden = true;
  }
}

function renderizarReservas(reservas) {
  elementos.lista.replaceChildren();

  elementos.total.textContent =
    estadoPagina.total === 1
      ? "1 reserva"
      : `${estadoPagina.total} reservas`;

  if (!reservas.length) {
    elementos.vazio.hidden = false;
    elementos.lista.hidden = true;
    elementos.paginacao.hidden = true;
    return;
  }

  const fragmento = document.createDocumentFragment();

  reservas.forEach((reserva) => {
    fragmento.append(
      criarCartaoReserva(reserva),
    );
  });

  elementos.lista.append(fragmento);
  elementos.lista.hidden = false;
  elementos.vazio.hidden = true;

  atualizarPaginacao();
}

function criarCartaoReserva(reserva) {
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

  nome.textContent = reserva.nome;

  const codigo = document.createElement("p");

  codigo.className =
    "mt-1 text-xs font-bold uppercase tracking-[0.1em] text-ink/55";

  codigo.textContent = reserva.codigo;

  dados.append(nome, codigo);

  const badge = document.createElement("span");

  badge.className =
    "w-fit px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em]";

  aplicarEstadoReserva(
    badge,
    reserva.estado,
  );

  topo.append(dados, badge);

  const detalhes = document.createElement("dl");

  detalhes.className =
    "mt-5 grid gap-x-6 gap-y-4 border-y border-ink/10 py-5 text-sm sm:grid-cols-2 xl:grid-cols-4";

  adicionarDetalhe(
    detalhes,
    "Evento",
    reserva.evento_titulo,
  );

  adicionarDetalhe(
    detalhes,
    "Data do evento",
    formatarData(reserva.evento_data),
  );

  adicionarDetalhe(
    detalhes,
    "Participantes",
    `${reserva.num_pessoas} pessoa(s)`,
  );

  adicionarDetalhe(
    detalhes,
    "Pagamento",
    formatarPagamento(
      reserva.metodo_pagamento,
    ),
  );

  adicionarDetalhe(
    detalhes,
    "Email",
    reserva.email,
  );

  adicionarDetalhe(
    detalhes,
    "Telefone",
    reserva.telefone,
  );

  adicionarDetalhe(
    detalhes,
    "Prazo de pagamento",
    formatarData(reserva.prazo_pagamento),
  );

  adicionarDetalhe(
    detalhes,
    "Criada em",
    formatarData(reserva.criado_em),
  );

  if (reserva.observacoes) {
    adicionarDetalhe(
      detalhes,
      "Observações",
      reserva.observacoes,
      true,
    );
  }

  const acoes = criarAcoesReserva(reserva);

  artigo.append(topo, detalhes);

  if (acoes) {
    artigo.append(acoes);
  }

  return artigo;
}

function adicionarDetalhe(
  lista,
  rotulo,
  valor,
  ocuparTudo = false,
) {
  const item = document.createElement("div");

  if (ocuparTudo) {
    item.className = "sm:col-span-2 xl:col-span-4";
  }

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

function criarAcoesReserva(reserva) {
  const transicoes = {
    pendente: [
      {
        estado: "confirmada",
        texto: "Confirmar pagamento",
        classe:
          "bg-ink text-cream hover:bg-amber",
      },
      {
        estado: "sem_pagamento",
        texto: "Sem pagamento",
        classe:
          "border border-ink/20 hover:bg-ink hover:text-cream",
      },
      {
        estado: "cancelada",
        texto: "Cancelar reserva",
        classe:
          "border border-danger/40 text-danger hover:bg-danger hover:text-white",
      },
    ],

    confirmada: [
      {
        estado: "cancelada",
        texto: "Cancelar reserva",
        classe:
          "border border-danger/40 text-danger hover:bg-danger hover:text-white",
      },
    ],
  };

  const opcoes =
    transicoes[reserva.estado] || [];

  if (!opcoes.length) {
    return null;
  }

  const contentor = document.createElement("div");

  contentor.className =
    "mt-5 flex flex-col gap-3 sm:flex-row";

  opcoes.forEach((opcao) => {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.dataset.id = String(reserva.id);
    botao.dataset.estado = opcao.estado;

    botao.className =
      `inline-flex min-h-11 items-center justify-center px-4 text-sm font-bold ${opcao.classe}`;

    botao.textContent = opcao.texto;

    contentor.append(botao);
  });

  return contentor;
}

function tratarAcaoReserva(event) {
  const botao = event.target.closest(
    "button[data-id][data-estado]",
  );

  if (!botao) return;

  const id = Number(botao.dataset.id);
  const novoEstado = botao.dataset.estado;

  if (
    !Number.isInteger(id) ||
    !novoEstado
  ) {
    return;
  }

  atualizarReserva(
    id,
    novoEstado,
    botao,
  );
}

async function atualizarReserva(
  id,
  novoEstado,
  botao,
) {
  const mensagensConfirmacao = {
    confirmada:
      "Confirmar que o pagamento desta reserva foi recebido?",

    sem_pagamento:
      "Marcar esta reserva como sem pagamento? A vaga ficará novamente disponível.",

    cancelada:
      "Cancelar esta reserva? O histórico será preservado e a vaga ficará novamente disponível quando aplicável.",
  };

  const confirmado = window.confirm(
    mensagensConfirmacao[novoEstado] ||
      "Confirmar alteração de estado?",
  );

  if (!confirmado) return;

  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "A guardar…";

  try {
    await pedirJson(
      `/api/admin/reservas/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: novoEstado,
        }),
      },
    );

    mostrarMensagem(
      "Estado da reserva atualizado com sucesso.",
      "sucesso",
    );

    await carregarReservas();
  } catch (error) {
    mostrarMensagem(
      error.message ||
        "Não foi possível atualizar a reserva.",
      "erro",
    );

    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
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

function aplicarEstadoReserva(
  elemento,
  estado,
) {
  const configuracao = {
    pendente: {
      texto: "Pendente",
      classes: "bg-warning/10 text-warning",
    },

    confirmada: {
      texto: "Confirmada",
      classes: "bg-success/10 text-success",
    },

    sem_pagamento: {
      texto: "Sem pagamento",
      classes: "bg-ink/10 text-ink/60",
    },

    cancelada: {
      texto: "Cancelada",
      classes: "bg-danger/10 text-danger",
    },
  };

  const atual =
    configuracao[estado] ||
    configuracao.pendente;

  elemento.textContent = atual.texto;
  elemento.className += ` ${atual.classes}`;
}

function formatarData(valor) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return data.toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatarPagamento(metodo) {
  return {
    mbway: "MB WAY",
    transferencia: "Transferência",
  }[metodo] || "Não indicado";
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

function mostrarMensagem(mensagem, tipo) {
  elementos.mensagem.textContent = mensagem;

  elementos.mensagem.className =
    tipo === "sucesso"
      ? "mt-6 border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
      : "mt-6 border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger";

  elementos.mensagem.hidden = false;
  elementos.mensagem.focus();
}

function esconderMensagem() {
  elementos.mensagem.hidden = true;
  elementos.mensagem.textContent = "";
}