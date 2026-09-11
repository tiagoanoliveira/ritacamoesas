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
    "group flex min-h-full flex-col overflow-hidden bg-paper shadow-soft";

  const imagemContainer =
    document.createElement("div");

  imagemContainer.className =
    "aspect-[4/3] overflow-hidden bg-ink/5";

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
    "mt-1 text-sm text-ink/60";
  local.textContent = evento.localizacao;

  const estatisticas =
    document.createElement("dl");

  estatisticas.className =
    "mt-5 grid grid-cols-3 border-y border-ink/10 text-sm";

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
    "inline-flex min-h-11 flex-1 items-center justify-center bg-ink px-4 text-sm font-extrabold text-cream hover:bg-amber";
  editar.textContent = "Editar";

  const ver = document.createElement("a");
  ver.href =
    `/eventos/detalhe.html?slug=` +
    encodeURIComponent(evento.slug);
  ver.target = "_blank";
  ver.rel = "noopener noreferrer";
  ver.className =
    "inline-flex min-h-11 items-center justify-center border border-ink/20 px-4 text-sm font-bold hover:border-ink";
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
    "flex h-full items-center justify-center px-5 text-center text-sm text-ink/40";

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
    "border-r border-ink/10 py-3 pr-2 last:border-r-0 last:pl-2";

  const dt = document.createElement("dt");
  dt.className =
    "text-xs text-ink/50";
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
      classes:
        "bg-success/10 text-success",
    },

    rascunho: {
      texto: "Rascunho",
      classes:
        "bg-warning/10 text-warning",
    },

    arquivado: {
      texto: "Arquivado",
      classes:
        "bg-ink/10 text-ink/60",
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

  elementos.eliminar.hidden = true;
  elementos.ocupadas.hidden = true;
  elementos.publico.hidden = true;
  elementos.linhaRemover.hidden = true;

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

  elementos.dataEvento.value =
    paraDatetimeLocal(evento.data_evento);

  elementos.localizacao.value =
    evento.localizacao;

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

      data_evento: converterParaIso(
        elementos.dataEvento.value
      ),

      localizacao:
        elementos.localizacao.value,

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

  if (!id) {
    return;
  }

  const titulo =
    elementos.titulo.value.trim();

  const confirmado = window.confirm(
    `Eliminar definitivamente “${titulo}”? Esta ação não pode ser anulada.`
  );

  if (!confirmado) {
    return;
  }

  elementos.eliminar.disabled = true;
  elementos.eliminar.textContent =
    "A eliminar…";

  try {
    await pedirJson(
      `/api/admin/eventos/${id}`,
      {
        method: "DELETE",
      }
    );

    fecharDialogo();

    mostrarMensagemPagina(
      "Evento eliminado com sucesso.",
      "sucesso"
    );

    await carregarEventos();
  } catch (error) {
    mostrarMensagemFormulario(
      error.message ||
        "Não foi possível eliminar o evento.",
      "erro"
    );
  } finally {
    elementos.eliminar.disabled = false;
    elementos.eliminar.textContent =
      "Eliminar evento";
  }
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