// GET /api/admin/reservas?evento_id=&estado=

import { exigirSessaoAdmin } from "../../../_lib/auth.js";
import { respostaErro, respostaJson } from "../../../_lib/eventos.js";

const ESTADOS_RESERVA = new Set([
  "pendente",
  "confirmada",
  "sem_pagamento",
  "cancelada",
]);

export async function onRequestGet({ request, env }) {
  const admin = await exigirSessaoAdmin(request, env);

  if (!admin) {
    return respostaErro("Sessão inválida ou expirada.", 401);
  }

  const url = new URL(request.url);
  const eventoId = Number(url.searchParams.get("evento_id"));
  const estado = String(url.searchParams.get("estado") || "")
    .trim()
    .toLowerCase();

  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return respostaErro("Evento inválido.", 422);
  }

  if (estado && !ESTADOS_RESERVA.has(estado)) {
    return respostaErro("Estado de reserva inválido.", 422);
  }

  let query = `
    SELECT
      r.id,
      r.codigo,
      r.evento_id,
      r.nome,
      r.email,
      r.telefone,
      r.num_pessoas,
      r.observacoes,
      r.metodo_pagamento,
      r.estado,
      r.prazo_pagamento,
      r.criado_em,
      r.atualizado_em
    FROM reservas r
    WHERE r.evento_id = ?
  `;

  const bindings = [eventoId];

  if (estado) {
    query += ` AND r.estado = ?`;
    bindings.push(estado);
  }

  query += ` ORDER BY datetime(r.criado_em) DESC, r.id DESC`;

  try {
    const { results = [] } = await env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return respostaJson({
      sucesso: true,
      reservas: results,
    });
  } catch (error) {
    console.error("Erro ao listar reservas do evento:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível carregar as reservas.",
      500,
    );
  }
}