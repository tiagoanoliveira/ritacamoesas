// functions/api/admin/eventos/index.js
// GET  /api/admin/eventos
// POST /api/admin/eventos

import {
  exigirSessaoAdmin,
} from "../../../_lib/auth.js";

import {
  normalizarDadosEvento,
  obterSlugDisponivel,
  pedidoMesmoSite,
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const SELECT_EVENTO = `
  SELECT
    e.id,
    e.slug,
    e.titulo,
    e.descricao,
    e.data_evento,
    e.localizacao,
    e.preco_centimos,
    e.vagas_max,
    e.vagas_ocupadas,
    e.imagem_url,
    e.estado,
    e.reservas_abrem_em,
    e.reservas_fecham_em,
    e.criado_em,
    e.atualizado_em,
    (
      SELECT COUNT(*)
        FROM reservas r
       WHERE r.evento_id = e.id
    ) AS total_reservas
  FROM eventos e
`;

export async function onRequestGet({
  request,
  env,
}) {
  const sessao = await exigirSessaoAdmin(
    request,
    env
  );

  if (!sessao) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401
    );
  }

  const url = new URL(request.url);

  const estado = String(
    url.searchParams.get("estado") || ""
  )
    .trim()
    .toLowerCase();

  const pesquisa = String(
    url.searchParams.get("q") || ""
  )
    .trim()
    .slice(0, 100);

  const condicoes = [];
  const valores = [];

  if (estado) {
    condicoes.push("e.estado = ?");
    valores.push(estado);
  }

  if (pesquisa) {
    condicoes.push(
      `(e.titulo LIKE ?
        OR e.localizacao LIKE ?
        OR e.slug LIKE ?)`
    );

    const termo = `%${pesquisa}%`;
    valores.push(termo, termo, termo);
  }

  const where = condicoes.length
    ? `WHERE ${condicoes.join(" AND ")}`
    : "";

  const consulta = `
    ${SELECT_EVENTO}
    ${where}
    ORDER BY
      CASE e.estado
        WHEN 'publicado' THEN 1
        WHEN 'rascunho' THEN 2
        ELSE 3
      END,
      datetime(e.data_evento) DESC,
      e.id DESC
    LIMIT 200
  `;

  const resultado = await env.DB.prepare(
    consulta
  )
    .bind(...valores)
    .all();

  return respostaJson({
    sucesso: true,
    eventos: resultado.results || [],
  });
}

export async function onRequestPost({
  request,
  env,
}) {
  const sessao = await exigirSessaoAdmin(
    request,
    env
  );

  if (!sessao) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401
    );
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro(
      "Origem do pedido não autorizada.",
      403
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return respostaErro(
      "O corpo do pedido não contém JSON válido.",
      400
    );
  }

  const { dados, erros } =
    normalizarDadosEvento(body);

  if (erros.length) {
    return respostaErro(
      "Revê os dados do evento.",
      422,
      erros
    );
  }

  dados.slug = await obterSlugDisponivel(
    env.DB,
    dados.slug
  );

  try {
    const resultado = await env.DB.prepare(
      `INSERT INTO eventos
         (
           slug,
           titulo,
           descricao,
           data_evento,
           localizacao,
           preco_centimos,
           vagas_max,
           vagas_ocupadas,
           imagem_url,
           estado,
           reservas_abrem_em,
           reservas_fecham_em,
           criado_em,
           atualizado_em
         )
       VALUES
         (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?,
          datetime('now'), datetime('now'))`
    )
      .bind(
        dados.slug,
        dados.titulo,
        dados.descricao,
        dados.data_evento,
        dados.localizacao,
        dados.preco_centimos,
        dados.vagas_max,
        dados.imagem_url,
        dados.estado,
        dados.reservas_abrem_em,
        dados.reservas_fecham_em
      )
      .run();

    const evento = await env.DB.prepare(
      `${SELECT_EVENTO}
        WHERE e.id = ?
        LIMIT 1`
    )
      .bind(resultado.meta.last_row_id)
      .first();

    return respostaJson(
      {
        sucesso: true,
        evento,
      },
      201
    );
  } catch (error) {
    console.error(
      "Erro ao criar evento:",
      error
    );

    if (
      String(error?.message || error).includes(
        "UNIQUE"
      )
    ) {
      return respostaErro(
        "Já existe um evento com este slug.",
        409
      );
    }

    return respostaErro(
      "Não foi possível criar o evento.",
      500
    );
  }
}