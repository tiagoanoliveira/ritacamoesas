// GET   /api/admin/orcamentos/:id
// PATCH /api/admin/orcamentos/:id
//
// PATCH aceita:
// {
//   estado: "pendente" | "respondido" | "arquivado",
//   resposta_admin?: "texto"
// }

import { exigirSessaoAdmin } from "../../../_lib/auth.js";
import {
  pedidoMesmoSite,
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const ESTADOS_ORCAMENTO = new Set([
  "pendente",
  "respondido",
  "arquivado",
]);

function obterId(valor) {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

async function obterOrcamento(
  db,
  id,
) {
  return db.prepare(
    `SELECT
       p.id,
       p.nome,
       p.email,
       p.telefone,
       p.tipo_evento,
       p.num_pessoas,
       p.tematica,
       p.data_pretendida,
       p.observacoes,
       p.estado,
       p.resposta_admin,
       p.respondido_por,
       p.criado_em,
       p.respondido_em,
       a.nome AS respondido_por_nome
     FROM pedidos_orcamento p
     LEFT JOIN admins a
            ON a.id = p.respondido_por
     WHERE p.id = ?
     LIMIT 1`,
  )
    .bind(id)
    .first();
}

export async function onRequestGet({
  request,
  env,
  params,
}) {
  const admin = await exigirSessaoAdmin(
    request,
    env,
  );

  if (!admin) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401,
    );
  }

  const id = obterId(params.id);

  if (!id) {
    return respostaErro(
      "Identificador de pedido inválido.",
      400,
    );
  }

  try {
    const orcamento = await obterOrcamento(
      env.DB,
      id,
    );

    if (!orcamento) {
      return respostaErro(
        "Pedido de orçamento não encontrado.",
        404,
      );
    }

    return respostaJson({
      sucesso: true,
      orcamento,
    });
  } catch (error) {
    console.error("Erro ao consultar orçamento:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível consultar o pedido de orçamento.",
      500,
    );
  }
}

export async function onRequestPatch({
  request,
  env,
  params,
}) {
  const admin = await exigirSessaoAdmin(
    request,
    env,
  );

  if (!admin) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401,
    );
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro(
      "Origem do pedido não autorizada.",
      403,
    );
  }

  const id = obterId(params.id);

  if (!id) {
    return respostaErro(
      "Identificador de pedido inválido.",
      400,
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return respostaErro(
      "O corpo do pedido não contém JSON válido.",
      400,
    );
  }

  const estado = String(body.estado || "")
    .trim()
    .toLowerCase();

  const respostaAdmin =
    typeof body.resposta_admin === "string"
      ? body.resposta_admin.trim().slice(0, 10_000)
      : "";

  if (!ESTADOS_ORCAMENTO.has(estado)) {
    return respostaErro(
      "O estado do pedido é inválido.",
      422,
    );
  }

  if (
    estado === "respondido" &&
    !respostaAdmin
  ) {
    return respostaErro(
      "Escreve uma resposta antes de marcar o pedido como respondido.",
      422,
    );
  }

  const existente = await obterOrcamento(
    env.DB,
    id,
  );

  if (!existente) {
    return respostaErro(
      "Pedido de orçamento não encontrado.",
      404,
    );
  }

  try {
    if (estado === "respondido") {
      await env.DB.prepare(
        `UPDATE pedidos_orcamento
            SET estado = 'respondido',
                resposta_admin = ?,
                respondido_por = ?,
                respondido_em = datetime('now')
          WHERE id = ?`,
      )
        .bind(
          respostaAdmin,
          admin.id,
          id,
        )
        .run();
    } else if (estado === "arquivado") {
      await env.DB.prepare(
        `UPDATE pedidos_orcamento
            SET estado = 'arquivado'
          WHERE id = ?`,
      )
        .bind(id)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE pedidos_orcamento
            SET estado = 'pendente',
                resposta_admin = NULL,
                respondido_por = NULL,
                respondido_em = NULL
          WHERE id = ?`,
      )
        .bind(id)
        .run();
    }

    const orcamento = await obterOrcamento(
      env.DB,
      id,
    );

    return respostaJson({
      sucesso: true,
      orcamento,
    });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível atualizar o pedido de orçamento.",
      500,
    );
  }
}