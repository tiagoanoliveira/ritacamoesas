// functions/_lib/eventos.js

export const ESTADOS_EVENTO = new Set([
  "rascunho",
  "publicado",
  "arquivado",
]);

export function normalizarDadosEvento(body) {
  const erros = [];

  const titulo = limparTexto(body.titulo, 160);
  const descricao = limparTexto(
    body.descricao,
    10_000
  );
  const localizacao = limparTexto(
    body.localizacao,
    300
  );

  const slugBase = limparTexto(body.slug, 180);
  const slug = slugificar(slugBase || titulo);

  const precoCentimos = Number(
    body.preco_centimos
  );

  const vagasMax = Number(body.vagas_max);

  const estado = limparTexto(
    body.estado,
    30
  ).toLowerCase();

  const imagemUrl =
    limparTexto(body.imagem_url, 2048) || null;

  const dataEvento = normalizarData(
    body.data_evento,
    "A data do evento é obrigatória.",
    erros
  );

  const reservasAbremEm =
    normalizarDataOpcional(
      body.reservas_abrem_em,
      "A data de abertura das reservas é inválida.",
      erros
    );

  const reservasFechamEm =
    normalizarDataOpcional(
      body.reservas_fecham_em,
      "A data de encerramento das reservas é inválida.",
      erros
    );

  if (!titulo) {
    erros.push("O título é obrigatório.");
  }

  if (!slug) {
    erros.push(
      "Não foi possível criar um slug válido."
    );
  }

  if (!descricao) {
    erros.push("A descrição é obrigatória.");
  }

  if (!localizacao) {
    erros.push("A localização é obrigatória.");
  }

  if (
    !Number.isInteger(precoCentimos) ||
    precoCentimos < 0 ||
    precoCentimos > 10_000_000
  ) {
    erros.push("O preço indicado é inválido.");
  }

  if (
    !Number.isInteger(vagasMax) ||
    vagasMax < 1 ||
    vagasMax > 10_000
  ) {
    erros.push(
      "O número máximo de vagas deve estar entre 1 e 10 000."
    );
  }

  if (!ESTADOS_EVENTO.has(estado)) {
    erros.push("O estado do evento é inválido.");
  }

  if (
    imagemUrl &&
    !imagemUrl.startsWith(
      "/media/eventos/"
    ) &&
    !/^https:\/\/[^\s]+$/i.test(imagemUrl)
  ) {
    erros.push("O endereço da imagem é inválido.");
  }

  if (
    reservasAbremEm &&
    reservasFechamEm &&
    new Date(reservasAbremEm) >=
      new Date(reservasFechamEm)
  ) {
    erros.push(
      "O encerramento das reservas tem de ser posterior à abertura."
    );
  }

  if (
    reservasFechamEm &&
    dataEvento &&
    new Date(reservasFechamEm) >
      new Date(dataEvento)
  ) {
    erros.push(
      "As reservas não podem encerrar depois do início do evento."
    );
  }

  return {
    erros,
    dados: {
      titulo,
      slug,
      descricao,
      data_evento: dataEvento,
      localizacao,
      preco_centimos: precoCentimos,
      vagas_max: vagasMax,
      imagem_url: imagemUrl,
      estado,
      reservas_abrem_em: reservasAbremEm,
      reservas_fecham_em: reservasFechamEm,
    },
  };
}

export async function obterSlugDisponivel(
  db,
  slugPretendido,
  ignorarId = null
) {
  const base = slugificar(slugPretendido);
  let candidato = base;

  for (let sufixo = 1; sufixo <= 100; sufixo += 1) {
    const existente = ignorarId
      ? await db
          .prepare(
            `SELECT id
               FROM eventos
              WHERE slug = ?
                AND id <> ?
              LIMIT 1`
          )
          .bind(candidato, ignorarId)
          .first()
      : await db
          .prepare(
            `SELECT id
               FROM eventos
              WHERE slug = ?
              LIMIT 1`
          )
          .bind(candidato)
          .first();

    if (!existente) {
      return candidato;
    }

    candidato = `${base}-${sufixo + 1}`;
  }

  throw new Error(
    "Não foi possível gerar um slug único."
  );
}

export function extrairChaveImagem(imagemUrl) {
  const prefixo = "/media/eventos/";

  if (
    typeof imagemUrl !== "string" ||
    !imagemUrl.startsWith(prefixo)
  ) {
    return null;
  }

  const ficheiroCodificado =
    imagemUrl.slice(prefixo.length);

  if (
    !ficheiroCodificado ||
    ficheiroCodificado.includes("/")
  ) {
    return null;
  }

  try {
    const ficheiro = decodeURIComponent(
      ficheiroCodificado
    );

    if (
      !/^[a-zA-Z0-9._-]+$/.test(ficheiro)
    ) {
      return null;
    }

    return `eventos/${ficheiro}`;
  } catch {
    return null;
  }
}

export function pedidoMesmoSite(request) {
  const origem = request.headers.get("Origin");

  if (!origem) {
    return true;
  }

  return origem === new URL(request.url).origin;
}

export function respostaJson(
  dados,
  status = 200
) {
  return Response.json(dados, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function respostaErro(
  mensagem,
  status = 400,
  detalhes = undefined
) {
  return respostaJson(
    {
      sucesso: false,
      erro: mensagem,
      ...(detalhes
        ? { detalhes }
        : {}),
    },
    status
  );
}

function limparTexto(valor, maximo) {
  return typeof valor === "string"
    ? valor.trim().slice(0, maximo)
    : "";
}

function normalizarData(
  valor,
  mensagemErro,
  erros
) {
  if (!valor) {
    erros.push(mensagemErro);
    return null;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    erros.push(mensagemErro);
    return null;
  }

  return data.toISOString();
}

function normalizarDataOpcional(
  valor,
  mensagemErro,
  erros
) {
  if (!valor) {
    return null;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    erros.push(mensagemErro);
    return null;
  }

  return data.toISOString();
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