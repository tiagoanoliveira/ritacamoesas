// public/admin/eventos.js

const elementos = {
  adminNome:
    document.getElementById("admin-nome"),

  adminEmail:
    document.getElementById("admin-email"),

  logout:
    document.getElementById("botao-logout"),

  novo:
    document.getElementById(
      "botao-novo-evento"
    ),

  criarVazio:
    document.getElementById(
      "botao-vazio-criar"
    ),

  filtros:
    document.getElementById("form-filtros"),

  pesquisa:
    document.getElementById(
      "filtro-pesquisa"
    ),

  filtroEstado:
    document.getElementById(
      "filtro-estado"
    ),

  mensagemPagina:
    document.getElementById(
      "mensagem-pagina"
    ),

  carregamento:
    document.getElementById(
      "carregamento-eventos"
    ),

  lista:
    document.getElementById(
      "lista-eventos"
    ),

  vazio:
    document.getElementById("estado-vazio"),

  total:
    document.getElementById(
      "total-eventos"
    ),

  dialogo:
    document.getElementById(
      "dialogo-evento"
    ),

  form:
    document.getElementById("form-evento"),

  tituloDialogo:
    document.getElementById(
      "titulo-dialogo"
    ),

  fechar:
    document.getElementById(
      "botao-fechar-dialogo"
    ),

  cancelar:
    document.getElementById(
      "botao-cancelar"
    ),

  guardar:
    document.getElementById(
      "botao-guardar"
    ),

  eliminar:
    document.getElementById(
      "botao-eliminar-evento"
    ),

  mensagemFormulario:
    document.getElementById(
      "mensagem-formulario"
    ),

  id:
    document.getElementById("evento-id"),

  titulo:
    document.getElementById("titulo"),

  slug:
    document.getElementById("slug"),

  descricao:
    document.getElementById("descricao"),

  dataEvento:
    document.getElementById(
      "data-evento"
    ),

  localizacao:
    document.getElementById(
      "localizacao"
    ),

  preco:
    document.getElementById("preco"),

  vagasMax:
    document.getElementById("vagas-max"),

  ocupadas:
    document.getElementById(
      "informacao-ocupadas"
    ),

  estado:
    document.getElementById("estado"),

  reservasAbrem:
    document.getElementById(
      "reservas-abrem"
    ),

  reservasFecham:
    document.getElementById(
      "reservas-fecham"
    ),

  imagem:
    document.getElementById("imagem"),

  imagemAtual:
    document.getElementById(
      "imagem-atual"
    ),

  preview:
    document.getElementById(
      "preview-imagem"
    ),

  previewVazio:
    document.getElementById(
      "preview-vazio"
    ),

  removerImagem:
    document.getElementById(
      "remover-imagem"
    ),

  linhaRemover:
    document.getElementById(
      "linha-remover-imagem"
    ),
    
  tematica: document.getElementById("tematica"),

  duracaoMinutos:
    document.getElementById("duracao-minutos"),

  localizacaoExcecao:
    document.getElementById("localizacao-excecao"),

  painelReservas:
    document.getElementById("painel-reservas"),

  resumoReservas:
    document.getElementById("resumo-reservas"),

  filtroReservas:
    document.getElementById("filtro-reservas-estado"),

  atualizarReservas:
    document.getElementById("botao-atualizar-reservas"),

  mensagemReservas:
    document.getElementById("mensagem-reservas"),

  listaReservas:
    document.getElementById("lista-reservas"),

  publico:
    document.getElementById(
      "ligacao-evento-publico"
    ),
};

let eventos = [];
let slugAlteradoManualmente = false;
let previewLocal = null;

inicializar();

async function inicializar() {
  registarEventos();

  try {
    const sessao = await pedirJson(
      "/api/admin/auth/me"
    );

    const admin = sessao.admin;

    elementos.adminNome.textContent =
      admin.nome || "Área administrativa";

    elementos.adminEmail.textContent =
      admin.email || "";

    await carregarEventos();
  } catch (error) {
    if (error.status !== 401) {
      mostrarMensagemPagina(
        error.message ||
          "Não foi possível iniciar o dashboard.",
        "erro"
      );
    }
  }
}

function registarEventos() {
  elementos.novo.addEventListener(
    "click",
    abrirNovoEvento
  );

  elementos.criarVazio.addEventListener(
    "click",
    abrirNovoEvento
  );

  elementos.fechar.addEventListener(
    "click",
    fecharDialogo
  );

  elementos.cancelar.addEventListener(
    "click",
    fecharDialogo
  );

  elementos.filtros.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      await carregarEventos();
    }
  );

  elementos.form.addEventListener(
    "submit",
    guardarEvento
  );

  elementos.eliminar.addEventListener(
    "click",
    eliminarEvento
  );

  elementos.logout.addEventListener(
    "click",
    terminarSessao
  );

  elementos.lista.addEventListener(
    "click",
    tratarAcaoLista
  );

  elementos.titulo.addEventListener(
    "input",
    () => {
      if (!slugAlteradoManualmente) {
        elementos.slug.value = slugificar(
          elementos.titulo.value
        );
      }
    }
  );

  elementos.slug.addEventListener(
    "input",
    () => {
      slugAlteradoManualmente = true;
      elementos.slug.value = slugificar(
        elementos.slug.value
      );
    }
  );

  elementos.imagem.addEventListener(
    "change",
    atualizarPreviewFicheiro
  );

  elementos.removerImagem.addEventListener(
    "change",
    atualizarPreviewRemocao
  );

  elementos.dialogo.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      fecharDialogo();
    }
  );

  elementos.dialogo.addEventListener(
    "click",
    (event) => {
      if (event.target === elementos.dialogo) {
        fecharDialogo();
      }
    }
  );
    elementos.filtroReservas.addEventListener(
    "change",
    () => carregarReservas(),
  );

    elementos.atualizarReservas.addEventListener(
    "click",
    () => carregarReservas(),
  );

    elementos.listaReservas.addEventListener(
    "click",
    alterarEstadoReserva,
  );
}

async function carregarEventos() {
  elementos.carregamento.hidden = false;
  elementos.lista.hidden = true;
  elementos.vazio.hidden = true;
  esconderMensagem(elementos.mensagemPagina);

  const params = new URLSearchParams();

  const pesquisa =
    elementos.pesquisa.value.trim();

  const estado =
    elementos.filtroEstado.value;

  if (pesquisa) {
    params.set("q", pesquisa);
  }

  if (estado) {
    params.set("estado", estado);
  }

  try {
    const dados = await pedirJson(
      `/api/admin/eventos?${params.toString()}`
    );

    eventos = dados.eventos || [];

    renderizarEventos();
  } catch (error) {
    mostrarMensagemPagina(
      error.message ||
        "Não foi possível carregar os eventos.",
      "erro"
    );
  } finally {
    elementos.carregamento.hidden = true;
  }
}

function renderizarEventos() {
  elementos.lista.replaceChildren();

  elementos.total.textContent =
    eventos.length === 1
      ? "1 evento"
      : `${eventos.length} eventos`;

  if (!eventos.length) {
    elementos.vazio.hidden = false;
    elementos.lista.hidden = true;
    return;
  }

  elementos.vazio.hidden = true;
  elementos.lista.hidden = false;

  const fragmento =
    document.createDocumentFragment();

  for (const evento of eventos) {
    fragmento.append(
      criarCartaoEvento(evento)
    );
  }

  elementos.lista.append(fragmento);
}

function criarCartaoEvento(evento) {
  const article = document.createElement(
    "article"
  );

  article.className =
    "group flex min-h-full flex-col overflow-hidden bg-white shadow-soft";

  const imagemContainer =
    document.createElement("div");

  imagemContainer.className =
    "aspect-[4/3] overflow-hidden bg-dusty-taupe-extra-dark/5";

  if (evento.imagem_url) {
    const imagem = document.createElement(
      "img"
    );

    imagem.src = evento.imagem_url;
    imagem.alt = "";
    imagem.loading = "lazy";
    imagem.decoding = "async";
    imagem.className =
      "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]";

    imagem.addEventListener(
      "error",
      () => {
        imagem.remove();
        imagemContainer.append(
          criarPlaceholderImagem()
        );
      }
    );

    imagemContainer.append(imagem);
  } else {
    imagemContainer.append(
      criarPlaceholderImagem()
    );
  }

  const conteudo = document.createElement(
    "div"
  );

  conteudo.className =
    "flex flex-1 flex-col p-5";

  const topo = document.createElement("div");
  topo.className =
    "flex items-start justify-between gap-3";

  const titulo = document.createElement("h3");
  titulo.className =
    "font-display text-2xl font-semibold leading-tight";
  titulo.textContent = evento.titulo;

  const estado = document.createElement(
    "span"
  );

  estado.className =
    "shrink-0 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.08em]";

  aplicarEstado(estado, evento.estado);

  topo.append(titulo, estado);

  const data = document.createElement("p");
  data.className =
    "mt-4 text-sm font-semibold";
  data.textContent = formatarData(
    evento.data_evento
  );

  const local = document.createElement("p");
  local.className =
    "mt-1 text-sm text-dusty-taupe-extra-dark/60";
  local.textContent = evento.localizacao;

  const estatisticas =
    document.createElement("dl");

  estatisticas.className =
    "mt-5 grid grid-cols-3 border-y border-dusty-taupe-dark/10 text-sm";

  adicionarEstatistica(
    estatisticas,
    "Preço",
    formatarPreco(evento.preco_centimos)
  );

  adicionarEstatistica(
    estatisticas,
    "Vagas",
    `${evento.vagas_ocupadas}/${evento.vagas_max}`
  );

  adicionarEstatistica(
    estatisticas,
    "Reservas",
    String(evento.total_reservas || 0)
  );

  const acoes = document.createElement("div");
  acoes.className =
    "mt-auto flex gap-3 pt-5";

  const editar = document.createElement(
    "button"
  );

  editar.type = "button";
  editar.dataset.action = "editar";
  editar.dataset.id = String(evento.id);
  editar.className =
    "inline-flex min-h-11 flex-1 items-center justify-center bg-dusty-taupe-extra-dark px-4 text-sm font-extrabold text-floral-white hover:bg-camel";
  editar.textContent = "Gerir Evento";

  const ver = document.createElement("a");
  ver.href =
    `/eventos/detalhe.html?slug=` +
    encodeURIComponent(evento.slug);
  ver.target = "_blank";
  ver.rel = "noopener noreferrer";
  ver.className =
    "inline-flex min-h-11 items-center justify-center border border-dusty-taupe-dark/20 px-4 text-sm font-bold hover:border-dusty-taupe-dark";
  ver.textContent = "Ver";

  acoes.append(editar, ver);

  conteudo.append(
    topo,
    data,
    local,
    estatisticas,
    acoes
  );

  article.append(
    imagemContainer,
    conteudo
  );

  return article;
}

function criarPlaceholderImagem() {
  const placeholder = document.createElement(
    "div"
  );

  placeholder.className =
    "flex h-full items-center justify-center px-5 text-center text-sm text-dusty-taupe-extra-dark/40";

  placeholder.textContent =
    "Evento sem imagem";

  return placeholder;
}

function adicionarEstatistica(
  lista,
  rotulo,
  valor
) {
  const div = document.createElement("div");
  div.className =
    "border-r border-dusty-taupe-dark/10 py-3 pr-2 last:border-r-0 last:pl-2";

  const dt = document.createElement("dt");
  dt.className =
    "text-xs text-dusty-taupe-extra-dark/50";
  dt.textContent = rotulo;

  const dd = document.createElement("dd");
  dd.className =
    "mt-1 font-bold tabular-nums";
  dd.textContent = valor;

  div.append(dt, dd);
  lista.append(div);
}

function aplicarEstado(elemento, estado) {
    const configuracao = {
    publicado: {
      texto: "Publicado",
      classes: "bg-success/10 text-success",
    },
    rascunho: {
      texto: "Rascunho",
      classes: "bg-warning/10 text-warning",
    },
    cancelado: {
      texto: "Cancelado",
      classes: "bg-danger/10 text-danger",
    },
    concluido: {
      texto: "Concluído",
      classes: "bg-dusty-taupe-extra-dark/10 text-dusty-taupe-extra-dark/60",
    },
  };

  const atual =
    configuracao[estado] ||
    configuracao.rascunho;

  elemento.textContent = atual.texto;
  elemento.className += ` ${atual.classes}`;
}

function tratarAcaoLista(event) {
  const botao = event.target.closest(
    "[data-action='editar']"
  );

  if (!botao) {
    return;
  }

  const id = Number(botao.dataset.id);
  const evento = eventos.find(
    (item) => item.id === id
  );

  if (evento) {
    abrirEditarEvento(evento);
  }
}

function abrirNovoEvento() {
  limparFormulario();

  elementos.tituloDialogo.textContent =
    "Novo evento";

  elementos.estado.value = "rascunho";
  elementos.vagasMax.value = "12";
  elementos.duracaoMinutos.value = "180";

  elementos.eliminar.hidden = true;
  elementos.ocupadas.hidden = true;
  elementos.publico.hidden = true;
  elementos.linhaRemover.hidden = true;
  elementos.painelReservas.hidden = true;
  elementos.listaReservas.replaceChildren();
  elementos.resumoReservas.textContent = "";
  slugAlteradoManualmente = false;

  elementos.dialogo.showModal();
  elementos.titulo.focus();
}

function abrirEditarEvento(evento) {
  limparFormulario();

  elementos.tituloDialogo.textContent =
    "Editar evento";

  elementos.id.value = evento.id;
  elementos.titulo.value = evento.titulo;
  elementos.slug.value = evento.slug;
  elementos.descricao.value =
    evento.descricao || "";
  elementos.tematica.value = evento.tematica || "";
  elementos.duracaoMinutos.value = evento.duracao_minutos || "";
  elementos.dataEvento.value =
    paraDatetimeLocal(evento.data_evento);

  elementos.localizacao.value =
    evento.localizacao;
  elementos.localizacaoExcecao.checked =
    Number(evento.localizacao_excecao) === 1;

  elementos.preco.value = (
    evento.preco_centimos / 100
  ).toFixed(2);

  elementos.vagasMax.value =
    evento.vagas_max;

  elementos.estado.value = evento.estado;

  elementos.reservasAbrem.value =
    paraDatetimeLocal(
      evento.reservas_abrem_em
    );

  elementos.reservasFecham.value =
    paraDatetimeLocal(
      evento.reservas_fecham_em
    );

  elementos.imagemAtual.value =
    evento.imagem_url || "";

  elementos.ocupadas.textContent =
    `${evento.vagas_ocupadas} vagas atualmente ocupadas.`;

  elementos.ocupadas.hidden = false;
  elementos.eliminar.hidden = false;

  elementos.publico.href =
    `/eventos/detalhe.html?slug=` +
    encodeURIComponent(evento.slug);

  elementos.publico.hidden = false;

  if (evento.imagem_url) {
    mostrarPreview(evento.imagem_url);
    elementos.linhaRemover.hidden = false;
  }

  slugAlteradoManualmente = true;

  elementos.dialogo.showModal();
  elementos.filtroReservas.value = "";
  elementos.painelReservas.hidden = false;
  carregarReservas(evento.id);
  elementos.titulo.focus();
}

async function guardarEvento(event) {
  event.preventDefault();
  esconderMensagem(
    elementos.mensagemFormulario
  );

  if (!elementos.form.reportValidity()) {
    return;
  }

  const id = Number(elementos.id.value) || null;
  const ficheiro =
    elementos.imagem.files[0] || null;

  const preco = Number(
    elementos.preco.value
  );

  if (!Number.isFinite(preco) || preco < 0) {
    mostrarMensagemFormulario(
      "Indica um preço válido.",
      "erro"
    );
    return;
  }

  elementos.guardar.disabled = true;
  elementos.guardar.textContent =
    ficheiro
      ? "A enviar imagem…"
      : "A guardar…";

  let uploadNovo = null;

  try {
    let imagemUrl =
      elementos.imagemAtual.value || null;

    if (elementos.removerImagem.checked) {
      imagemUrl = null;
    }

    if (ficheiro) {
      uploadNovo =
        await enviarImagem(ficheiro);

      imagemUrl = uploadNovo.url;
      elementos.guardar.textContent =
        "A guardar evento…";
    }

    const payload = {
      titulo: elementos.titulo.value,
      slug: elementos.slug.value,
      descricao: elementos.descricao.value,

      tematica: elementos.tematica.value,

      duracao_minutos: Number(
        elementos.duracaoMinutos.value,
      ),

      data_evento: converterParaIso(
        elementos.dataEvento.value
      ),

      localizacao:
        elementos.localizacao.value,

      localizacao_excecao:
      elementos.localizacaoExcecao.checked ? 1 : 0,

      preco_centimos: Math.round(
        preco * 100
      ),

      vagas_max: Number(
        elementos.vagasMax.value
      ),

      estado: elementos.estado.value,

      reservas_abrem_em:
        converterParaIsoOpcional(
          elementos.reservasAbrem.value
        ),

      reservas_fecham_em:
        converterParaIsoOpcional(
          elementos.reservasFecham.value
        ),

      imagem_url: imagemUrl,
    };

    const dados = await pedirJson(
      id
        ? `/api/admin/eventos/${id}`
        : "/api/admin/eventos",
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    fecharDialogo();

    mostrarMensagemPagina(
      id
        ? "Evento atualizado com sucesso."
        : "Evento criado com sucesso.",
      "sucesso"
    );

    await carregarEventos();

    const guardado = dados.evento;

    if (guardado?.estado === "publicado") {
      elementos.mensagemPagina.focus();
    }
  } catch (error) {
    if (uploadNovo?.chave) {
      await eliminarUploadTemporario(
        uploadNovo.chave
      );
    }

    const detalhes = Array.isArray(
      error.detalhes
    )
      ? ` ${error.detalhes.join(" ")}`
      : "";

    mostrarMensagemFormulario(
      `${error.message ||
        "Não foi possível guardar o evento."}${detalhes}`,
      "erro"
    );
  } finally {
    elementos.guardar.disabled = false;
    elementos.guardar.textContent =
      "Guardar evento";
  }
}

async function enviarImagem(ficheiro) {
  const formData = new FormData();
  formData.append("imagem", ficheiro);

  return pedirJson(
    "/api/admin/eventos/upload",
    {
      method: "POST",
      body: formData,
    }
  );
}

async function eliminarUploadTemporario(
  chave
) {
  try {
    await pedirJson(
      "/api/admin/eventos/upload",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chave }),
      }
    );
  } catch (error) {
    console.error(
      "Não foi possível remover o upload temporário:",
      error
    );
  }
}

async function eliminarEvento() {
  const id = Number(elementos.id.value);

  if (!id) return;

  const titulo = elementos.titulo.value.trim();
  const confirmado = window.confirm(
    `Cancelar “${titulo}”? O evento e as reservas serão preservados. As reservas associadas passarão ao estado “cancelada”.`,
  );

  if (!confirmado) return;

  elementos.eliminar.disabled = true;
  elementos.eliminar.textContent = "A cancelar…";

  try {
    const resultado = await pedirJson(
      `/api/admin/eventos/${id}`,
      { method: "DELETE" },
    );

    fecharDialogo();

    const total = Number(resultado.reservas_canceladas || 0);
    mostrarMensagemPagina(
      total > 0
        ? `Evento cancelado. ${total} reserva(s) foram também canceladas, sem apagar o histórico.`
        : "Evento cancelado sem apagar o histórico.",
      "sucesso",
    );

    await carregarEventos();
  } catch (error) {
    mostrarMensagemFormulario(
      error.message || "Não foi possível cancelar o evento.",
      "erro",
    );
  } finally {
    elementos.eliminar.disabled = false;
    elementos.eliminar.textContent = "Cancelar evento";
  }
}

async function carregarReservas(
  eventoId = Number(elementos.id.value),
) {
  if (!eventoId) return;

  elementos.listaReservas.replaceChildren();
  elementos.resumoReservas.textContent = "A carregar…";
  esconderMensagem(elementos.mensagemReservas);

  const params = new URLSearchParams({
    evento_id: String(eventoId),
  });

  if (elementos.filtroReservas.value) {
    params.set("estado", elementos.filtroReservas.value);
  }

  try {
    const dados = await pedirJson(
      `/api/admin/reservas?${params.toString()}`,
    );

    renderizarReservas(dados.reservas || []);
  } catch (error) {
    elementos.resumoReservas.textContent = "";
    mostrarMensagem(
      elementos.mensagemReservas,
      error.message || "Não foi possível carregar as reservas.",
      "erro",
    );
  }
}

function renderizarReservas(reservas) {
  elementos.listaReservas.replaceChildren();

  const participantes = reservas.reduce(
    (total, reserva) => total + Number(reserva.num_pessoas || 0),
    0,
  );

  elementos.resumoReservas.textContent =
    `${reservas.length} reserva(s) · ${participantes} participante(s)`;

  if (!reservas.length) {
    const vazio = document.createElement("p");
    vazio.className = "border border-dashed border-ink/20 p-4 text-sm text-ink/55";
    vazio.textContent = "Não existem reservas com este filtro.";
    elementos.listaReservas.append(vazio);
    return;
  }

  const fragmento = document.createDocumentFragment();

  reservas.forEach((reserva) => {
    const artigo = document.createElement("article");
    artigo.className = "border border-ink/15 bg-cream p-4";

    const topo = document.createElement("div");
    topo.className = "flex items-start justify-between gap-3";

    const identidade = document.createElement("div");
    const nome = document.createElement("h4");
    nome.className = "text-sm font-extrabold";
    nome.textContent = reserva.nome;

    const codigo = document.createElement("p");
    codigo.className = "mt-1 text-xs text-ink/55";
    codigo.textContent = `${reserva.codigo} · ${reserva.num_pessoas} pessoa(s)`;
    identidade.append(nome, codigo);

    const estado = document.createElement("span");
    estado.className = "shrink-0 bg-ink/10 px-2 py-1 text-[0.68rem] font-bold uppercase";
    estado.textContent = formatarEstadoReserva(reserva.estado);
    topo.append(identidade, estado);

    const contactos = document.createElement("p");
    contactos.className = "mt-3 break-words text-xs text-ink/65";
    contactos.textContent = `${reserva.email} · ${reserva.telefone}`;

    const pagamento = document.createElement("p");
    pagamento.className = "mt-1 text-xs text-ink/55";
    pagamento.textContent = `Pagamento: ${reserva.metodo_pagamento || "não indicado"}`;

    const acoes = document.createElement("div");
    acoes.className = "mt-3 flex flex-wrap gap-2";

    if (reserva.estado === "pendente") {
      acoes.append(
        criarBotaoEstadoReserva(reserva.id, "confirmada", "Confirmar"),
        criarBotaoEstadoReserva(reserva.id, "sem_pagamento", "Sem pagamento"),
        criarBotaoEstadoReserva(reserva.id, "cancelada", "Cancelar"),
      );
    } else if (reserva.estado === "confirmada") {
      acoes.append(
        criarBotaoEstadoReserva(reserva.id, "cancelada", "Cancelar"),
      );
    }

    artigo.append(topo, contactos, pagamento);
    if (acoes.childElementCount) artigo.append(acoes);
    fragmento.append(artigo);
  });

  elementos.listaReservas.append(fragmento);
}

function criarBotaoEstadoReserva(id, estado, texto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.dataset.reservaId = String(id);
  botao.dataset.estado = estado;
  botao.className =
    estado === "cancelada"
      ? "min-h-10 border border-danger/30 px-3 text-xs font-bold text-danger hover:bg-danger hover:text-white"
      : "min-h-10 border border-ink/20 px-3 text-xs font-bold hover:bg-ink hover:text-cream";
  botao.textContent = texto;
  return botao;
}

async function alterarEstadoReserva(event) {
  const botao = event.target.closest(
    "[data-reserva-id][data-estado]",
  );

  if (!botao) return;

  const reservaId = Number(botao.dataset.reservaId);
  const estado = botao.dataset.estado;

  if (
    estado === "cancelada" &&
    !window.confirm("Cancelar esta reserva sem apagar o respetivo histórico?")
  ) {
    return;
  }

  botao.disabled = true;

  try {
    await pedirJson(`/api/admin/reservas/${reservaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });

    await Promise.all([
      carregarReservas(),
      carregarEventos(),
    ]);
  } catch (error) {
    mostrarMensagem(
      elementos.mensagemReservas,
      error.message || "Não foi possível atualizar a reserva.",
      "erro",
    );
  } finally {
    botao.disabled = false;
  }
}

function formatarEstadoReserva(estado) {
  return {
    pendente: "Pendente",
    confirmada: "Confirmada",
    sem_pagamento: "Sem pagamento",
    cancelada: "Cancelada",
  }[estado] || estado;
}

async function terminarSessao() {
  elementos.logout.disabled = true;

  try {
    await fetch(
      "/api/admin/auth/logout",
      {
        method: "POST",
        credentials: "same-origin",
      }
    );
  } finally {
    window.location.replace(
      "/admin/login.html"
    );
  }
}

function atualizarPreviewFicheiro() {
  libertarPreviewLocal();

  const ficheiro =
    elementos.imagem.files[0];

  if (!ficheiro) {
    atualizarPreviewRemocao();
    return;
  }

  if (ficheiro.size > 5 * 1024 * 1024) {
    elementos.imagem.value = "";

    mostrarMensagemFormulario(
      "A imagem deve ter no máximo 5 MB.",
      "erro"
    );

    atualizarPreviewRemocao();
    return;
  }

  previewLocal =
    URL.createObjectURL(ficheiro);

  elementos.removerImagem.checked = false;
  mostrarPreview(previewLocal);
}

function atualizarPreviewRemocao() {
  if (elementos.removerImagem.checked) {
    esconderPreview();
    return;
  }

  const atual =
    elementos.imagemAtual.value;

  if (atual) {
    mostrarPreview(atual);
  } else {
    esconderPreview();
  }
}

function mostrarPreview(url) {
  elementos.preview.src = url;
  elementos.preview.hidden = false;
  elementos.previewVazio.hidden = true;
}

function esconderPreview() {
  elementos.preview.removeAttribute("src");
  elementos.preview.hidden = true;
  elementos.previewVazio.hidden = false;
}

function limparFormulario() {
  elementos.form.reset();
  elementos.id.value = "";
  elementos.imagemAtual.value = "";
  elementos.removerImagem.checked = false;

  esconderMensagem(
    elementos.mensagemFormulario
  );

  libertarPreviewLocal();
  esconderPreview();
}

function fecharDialogo() {
  if (elementos.dialogo.open) {
    elementos.dialogo.close();
  }

  limparFormulario();
}

function libertarPreviewLocal() {
  if (previewLocal) {
    URL.revokeObjectURL(previewLocal);
    previewLocal = null;
  }
}

async function pedirJson(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: "same-origin",
    ...opcoes,
  });

  let dados = {};

  const contentType =
    resposta.headers.get("Content-Type") || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    dados = await resposta.json();
  }

  if (resposta.status === 401) {
    window.location.replace(
      "/admin/login.html"
    );

    const erro = new Error(
      "Sessão expirada."
    );

    erro.status = 401;
    throw erro;
  }

  if (!resposta.ok) {
    const erro = new Error(
      dados.erro ||
        "O pedido não foi concluído."
    );

    erro.status = resposta.status;
    erro.detalhes = dados.detalhes;
    throw erro;
  }

  return dados;
}

function mostrarMensagemPagina(
  mensagem,
  tipo
) {
  mostrarMensagem(
    elementos.mensagemPagina,
    mensagem,
    tipo
  );
}

function mostrarMensagemFormulario(
  mensagem,
  tipo
) {
  mostrarMensagem(
    elementos.mensagemFormulario,
    mensagem,
    tipo
  );

  elementos.mensagemFormulario.focus();
}

function mostrarMensagem(
  elemento,
  mensagem,
  tipo
) {
  elemento.textContent = mensagem;

  elemento.className =
    tipo === "sucesso"
      ? "mt-6 border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
      : "mt-6 border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger";

  elemento.hidden = false;
}

function esconderMensagem(elemento) {
  elemento.hidden = true;
  elemento.textContent = "";
}

function converterParaIso(valor) {
  return valor
    ? new Date(valor).toISOString()
    : null;
}

function converterParaIsoOpcional(valor) {
  return valor
    ? new Date(valor).toISOString()
    : null;
}

function paraDatetimeLocal(valor) {
  if (!valor) {
    return "";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const local = new Date(
    data.getTime() -
      data.getTimezoneOffset() * 60_000
  );

  return local
    .toISOString()
    .slice(0, 16);
}

function formatarData(valor) {
  return new Date(valor).toLocaleString(
    "pt-PT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function formatarPreco(centimos) {
  return (centimos / 100).toLocaleString(
    "pt-PT",
    {
      style: "currency",
      currency: "EUR",
    }
  );
}

function slugificar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}