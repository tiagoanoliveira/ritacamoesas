const elementos = {
  adminNome:
    document.getElementById("admin-nome"),

  adminEmail:
    document.getElementById("admin-email"),

  saudacao:
    document.getElementById("saudacao-admin"),

  logout:
    document.getElementById("botao-logout"),

  mensagem:
    document.getElementById("mensagem-pagina"),

  metricas:
    document.getElementById("metricas"),

  reservasPendentes:
    document.getElementById(
      "metrica-reservas-pendentes",
    ),

  reservasConfirmadas:
    document.getElementById(
      "metrica-reservas-confirmadas",
    ),

  orcamentosPendentes:
    document.getElementById(
      "metrica-orcamentos-pendentes",
    ),

  eventosFuturos:
    document.getElementById(
      "metrica-eventos-futuros",
    ),

  listaReservas:
    document.getElementById(
      "lista-reservas-pendentes",
    ),

  listaOrcamentos:
    document.getElementById(
      "lista-orcamentos-pendentes",
    ),

  listaEventos:
    document.getElementById(
      "lista-proximos-eventos",
    ),
};

inicializar();

async function inicializar() {
  elementos.logout.addEventListener(
    "click",
    terminarSessao,
  );

  try {
    const sessao = await pedirJson(
      "/api/admin/auth/me",
    );

    const admin = sessao.admin || {};

    elementos.adminNome.textContent =
      admin.nome ||
      "Área administrativa";

    elementos.adminEmail.textContent =
      admin.email || "";

    elementos.saudacao.textContent =
      primeiroNome(admin.nome) || "Rita";

    await carregarDashboard();
  } catch (error) {
    if (error.status !== 401) {
      mostrarMensagem(
        error.message ||
          "Não foi possível carregar o resumo.",
        "erro",
      );
    }
  }
}

async function carregarDashboard() {
  elementos.metricas.setAttribute(
    "aria-busy",
    "true",
  );

  esconderMensagem();

  try {
    const dados = await pedirJson(
      "/api/admin/dashboard",
    );

    renderizarMetricas(dados.metricas || {});
    renderizarReservas(
      dados.proximas_reservas || [],
    );
    renderizarOrcamentos(
      dados.ultimos_orcamentos || [],
    );
    renderizarEventos(
      dados.proximos_eventos || [],
    );
  } catch (error) {
    mostrarMensagem(
      error.message ||
        "Não foi possível carregar o resumo.",
      "erro",
    );
  } finally {
    elementos.metricas.setAttribute(
      "aria-busy",
      "false",
    );
  }
}

function renderizarMetricas(metricas) {
  elementos.reservasPendentes.textContent =
    metricas.reservas_pendentes || 0;

  elementos.reservasConfirmadas.textContent =
    metricas.reservas_confirmadas || 0;

  elementos.orcamentosPendentes.textContent =
    metricas.orcamentos_pendentes || 0;

  elementos.eventosFuturos.textContent =
    metricas.eventos_futuros || 0;
}

function renderizarReservas(reservas) {
  elementos.listaReservas.replaceChildren();

  if (!reservas.length) {
    elementos.listaReservas.append(
      criarEstadoVazio(
        "Não há reservas pendentes.",
      ),
    );
    return;
  }

  const fragmento = document.createDocumentFragment();

  reservas.forEach((reserva) => {
    const link = document.createElement("a");

    link.href =
      "/admin/reservas.html?estado=pendente";

    link.className =
      "block border border-ink/10 p-4 transition-colors hover:border-amber hover:bg-cream";

    const linha = document.createElement("div");

    linha.className =
      "flex items-start justify-between gap-4";

    const dados = document.createElement("div");

    const nome = document.createElement("p");

    nome.className = "font-bold";
    nome.textContent = reserva.nome;

    const evento = document.createElement("p");

    evento.className =
      "mt-1 text-sm text-ink/60";

    evento.textContent =
      `${reserva.evento_titulo} · ${reserva.num_pessoas} pessoa(s)`;

    dados.append(nome, evento);

    const prazo = document.createElement("p");

    prazo.className =
      "shrink-0 text-right text-xs font-bold text-warning";

    prazo.textContent =
      formatarData(reserva.prazo_pagamento);

    linha.append(dados, prazo);
    link.append(linha);
    fragmento.append(link);
  });

  elementos.listaReservas.append(fragmento);
}

function renderizarOrcamentos(orcamentos) {
  elementos.listaOrcamentos.replaceChildren();

  if (!orcamentos.length) {
    elementos.listaOrcamentos.append(
      criarEstadoVazio(
        "Não há pedidos pendentes.",
      ),
    );
    return;
  }

  const fragmento = document.createDocumentFragment();

  orcamentos.forEach((orcamento) => {
    const link = document.createElement("a");

    link.href =
      "/admin/orcamentos.html?estado=pendente";

    link.className =
      "block border border-ink/10 p-4 transition-colors hover:border-amber hover:bg-cream";

    const nome = document.createElement("p");

    nome.className = "font-bold";
    nome.textContent = orcamento.nome;

    const detalhe = document.createElement("p");

    detalhe.className =
      "mt-1 text-sm text-ink/60";

    detalhe.textContent =
      `${orcamento.tipo_evento} · ${orcamento.num_pessoas} pessoa(s)`;

    const data = document.createElement("p");

    data.className =
      "mt-2 text-xs text-ink/50";

    data.textContent =
      `Recebido: ${formatarData(
        orcamento.criado_em,
      )}`;

    link.append(nome, detalhe, data);
    fragmento.append(link);
  });

  elementos.listaOrcamentos.append(fragmento);
}

function renderizarEventos(eventos) {
  elementos.listaEventos.replaceChildren();

  if (!eventos.length) {
    elementos.listaEventos.append(
      criarEstadoVazio(
        "Não há eventos publicados futuros.",
      ),
    );
    return;
  }

  const fragmento = document.createDocumentFragment();

  eventos.forEach((evento) => {
    const link = document.createElement("a");

    link.href = "/admin/eventos.html";

    link.className =
      "block border border-ink/10 p-4 transition-colors hover:border-amber hover:bg-cream";

    const titulo = document.createElement("h3");

    titulo.className =
      "font-display text-xl font-semibold";

    titulo.textContent = evento.titulo;

    const data = document.createElement("p");

    data.className =
      "mt-2 text-sm font-semibold";

    data.textContent =
      formatarData(evento.data_evento);

    const vagas = document.createElement("p");

    vagas.className =
      "mt-1 text-sm text-ink/60";

    vagas.textContent =
      `${evento.vagas_ocupadas}/${evento.vagas_max} vagas ocupadas`;

    link.append(titulo, data, vagas);
    fragmento.append(link);
  });

  elementos.listaEventos.append(fragmento);
}

function criarEstadoVazio(mensagem) {
  const paragrafo = document.createElement("p");

  paragrafo.className =
    "border border-dashed border-ink/20 p-4 text-sm text-ink/55";

  paragrafo.textContent = mensagem;

  return paragrafo;
}

function primeiroNome(nome) {
  return String(nome || "")
    .trim()
    .split(/\s+/)[0];
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