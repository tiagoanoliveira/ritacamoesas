// functions/api/admin/eventos/[id].js
// GET    /api/admin/eventos/:id
// PUT    /api/admin/eventos/:id
// DELETE /api/admin/eventos/:id

import {
  exigirSessaoAdmin,
} from "../../../_lib/auth.js";

import {
  normalizarDadosEvento,
  obterSlugDisponivel,
  extrairChaveImagem,
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
    e.tematica,
    e.duracao_minutos,
    e.data_evento,
    e.localizacao,
    e.localizacao_excecao,
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
  params,
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

  const id = obterId(params.id);

  if (!id) {
    return respostaErro(
      "Identificador inválido.",
      400
    );
  }

  const evento = await env.DB.prepare(
    `${SELECT_EVENTO}
      WHERE e.id = ?
      LIMIT 1`
  )
    .bind(id)
    .first();

  if (!evento) {
    return respostaErro(
      "Evento não encontrado.",
      404
    );
  }

  return respostaJson({
    sucesso: true,
    evento,
  });
}

export async function onRequestPut({
  request,
  env,
  params,
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

  const id = obterId(params.id);

  if (!id) {
    return respostaErro(
      "Identificador inválido.",
      400
    );
  }

  const existente = await env.DB.prepare(
    `SELECT
       id,
       vagas_ocupadas,
       imagem_url
     FROM eventos
     WHERE id = ?
     LIMIT 1`
  )
    .bind(id)
    .first();

  if (!existente) {
    return respostaErro(
      "Evento não encontrado.",
      404
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

  if (
    Number.isInteger(dados.vagas_max) &&
    dados.vagas_max < existente.vagas_ocupadas
  ) {
    erros.push(
      `O evento já tem ${existente.vagas_ocupadas} vagas ocupadas. A lotação não pode ser inferior.`
    );
  }

  if (erros.length) {
    return respostaErro(
      "Revê os dados do evento.",
      422,
      erros
    );
  }

  dados.slug = await obterSlugDisponivel(
    env.DB,
    dados.slug,
    id
  );

  try {
    await env.DB.prepare(
      `UPDATE eventos
          SET slug = ?,
              titulo = ?,
              descricao = ?,
              tematica = ?,
              duracao_minutos = ?,
              data_evento = ?,
              localizacao = ?,
              localizacao_excecao = ?,
              preco_centimos = ?,
              vagas_max = ?,
              imagem_url = ?,
              estado = ?,
              reservas_abrem_em = ?,
              reservas_fecham_em = ?,
              atualizado_em = datetime('now')
        WHERE id = ?`,
    )
      .bind(
        dados.slug,
        dados.titulo,
        dados.descricao,
        dados.tematica,
        dados.duracao_minutos,
        dados.data_evento,
        dados.localizacao,
        dados.localizacao_excecao,
        dados.preco_centimos,
        dados.vagas_max,
        dados.imagem_url,
        dados.estado,
        dados.reservas_abrem_em,
        dados.reservas_fecham_em,
        id,
      )
      .run();

    if (
      existente.imagem_url &&
      existente.imagem_url !== dados.imagem_url
    ) {
      const chaveAntiga = extrairChaveImagem(
        existente.imagem_url
      );

      if (chaveAntiga && env.MEDIA) {
        try {
          await env.MEDIA.delete(
            chaveAntiga
          );
        } catch (error) {
          console.error(
            "Não foi possível remover a imagem antiga:",
            error
          );
        }
      }
    }

    const evento = await env.DB.prepare(
      `${SELECT_EVENTO}
        WHERE e.id = ?
        LIMIT 1`
    )
      .bind(id)
      .first();

    return respostaJson({
      sucesso: true,
      evento,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar evento:",
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
      "Não foi possível atualizar o evento.",
      500
    );
  }
}

export async function onRequestDelete({
  request,
  env,
  params,
}) {
  const sessao = await exigirSessaoAdmin(request, env);

  if (!sessao) {
    return respostaErro("Sessão inválida ou expirada.", 401);
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro("Origem do pedido não autorizada.", 403);
  }

  const id = obterId(params.id);

  if (!id) {
    return respostaErro("Identificador inválido.", 400);
  }

  const evento = await env.DB.prepare(
    `SELECT id, estado
       FROM eventos
      WHERE id = ?
      LIMIT 1`,
  )
    .bind(id)
    .first();

  if (!evento) {
    return respostaErro("Evento não encontrado.", 404);
  }

  if (evento.estado === "cancelado") {
    return respostaJson({
      sucesso: true,
      evento_estado: "cancelado",
      reservas_canceladas: 0,
    });
  }

  try {
    const resultados = await env.DB.batch([
      env.DB.prepare(
        `UPDATE eventos
            SET estado = 'cancelado',
                atualizado_em = datetime('now')
          WHERE id = ?`,
      ).bind(id),

      env.DB.prepare(
        `UPDATE reservas
            SET estado = 'cancelada',
                atualizado_em = datetime('now')
          WHERE evento_id = ?
            AND estado <> 'cancelada'`,
      ).bind(id),
    ]);

    return respostaJson({
      sucesso: true,
      evento_estado: "cancelado",
      reservas_canceladas:
        resultados[1]?.meta?.changes ?? 0,
    });
  } catch (error) {
    console.error("Erro ao cancelar evento:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível cancelar o evento.",
      500,
    );
  }
}
function obterId(valor) {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}