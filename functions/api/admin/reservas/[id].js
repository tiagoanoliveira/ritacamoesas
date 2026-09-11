/// PATCH /api/admin/reservas/:id

import { exigirSessaoAdmin } from "../../../_lib/auth.js";
import {
  pedidoMesmoSite,
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const TRANSICOES = {
  pendente: new Set([
    "confirmada",
    "sem_pagamento",
    "cancelada",
  ]),
  confirmada: new Set(["cancelada"]),
  sem_pagamento: new Set([]),
  cancelada: new Set([]),
};

export async function onRequestPatch({
  request,
  env,
  params,
}) {
  const admin = await exigirSessaoAdmin(request, env);

  if (!admin) {
    return respostaErro("Sessão inválida ou expirada.", 401);
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro("Origem do pedido não autorizada.", 403);
  }

  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return respostaErro("Reserva inválida.", 400);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return respostaErro("O pedido não contém JSON válido.", 400);
  }

  const novoEstado = String(body.estado || "")
    .trim()
    .toLowerCase();

  const reserva = await env.DB.prepare(
    `SELECT id, evento_id, estado
       FROM reservas
      WHERE id = ?
      LIMIT 1`,
  )
    .bind(id)
    .first();

  if (!reserva) {
    return respostaErro("Reserva não encontrada.", 404);
  }

  if (!TRANSICOES[reserva.estado]?.has(novoEstado)) {
    return respostaErro(
      `Não é possível alterar uma reserva ${reserva.estado} para ${novoEstado || "esse estado"}.`,
      409,
    );
  }

  try {
    await env.DB.prepare(
      `UPDATE reservas
          SET estado = ?,
              confirmado_por = ?,
              atualizado_em = datetime('now')
        WHERE id = ?`,
    )
      .bind(novoEstado, admin.id, id)
      .run();

    return respostaJson({
      sucesso: true,
      novo_estado: novoEstado,
      evento_id: reserva.evento_id,
    });
  } catch (error) {
    console.error("Erro ao atualizar reserva:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível atualizar a reserva.",
      500,
    );
  }
}