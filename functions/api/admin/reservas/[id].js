// functions/api/admin/reservas/[id].js
// Endpoint protegido (Admin) para gerir uma reserva específica.
// PATCH /api/admin/reservas/:id  { estado: "confirmada" | "sem_pagamento" | "cancelada" }
//
// Regra chave pedida pelo cliente:
// Se o Admin marcar como "sem_pagamento" DEPOIS do prazo de 24h, a reserva é
// automaticamente cancelada e a vaga volta a ficar disponível (o trigger SQL
// trg_reserva_update_para_cancelada já decrementa vagas_ocupadas).

import { exigirSessaoAdmin } from "../../../_lib/auth.js";

export async function onRequestPatch({ request, env, params }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const { estado } = await request.json();
  const permitidos = ["confirmada", "sem_pagamento", "cancelada"];
  if (!permitidos.includes(estado)) {
    return Response.json({ erro: "Estado inválido." }, { status: 422 });
  }

  const reserva = await env.DB.prepare(`SELECT * FROM reservas WHERE id = ?`)
    .bind(params.id).first();
  if (!reserva) return Response.json({ erro: "Reserva não encontrada." }, { status: 404 });

  // "sem_pagamento" só faz sentido para reservas ainda pendentes
  if (estado === "sem_pagamento" && reserva.estado !== "pendente") {
    return Response.json({ erro: "Só é possível marcar como 'sem pagamento' reservas pendentes." }, { status: 409 });
  }

  await env.DB.prepare(
    `UPDATE reservas
       SET estado = ?, confirmado_por = ?, atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(estado, admin.id, params.id).run();
  // Trigger SQL repõe automaticamente a vaga no evento quando aplicável.

  return Response.json({ sucesso: true, novo_estado: estado });
}

// GET /api/admin/reservas?evento_id=&estado=  -> listagem com filtros para o dashboard
export async function onRequestGet({ request, env }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const eventoId = url.searchParams.get("evento_id");
  const estado = url.searchParams.get("estado");

  let query = `SELECT r.*, e.titulo AS evento_titulo, e.data_evento
               FROM reservas r JOIN eventos e ON e.id = r.evento_id WHERE 1=1`;
  const bindings = [];
  if (eventoId) { query += ` AND r.evento_id = ?`; bindings.push(eventoId); }
  if (estado) { query += ` AND r.estado = ?`; bindings.push(estado); }
  query += ` ORDER BY r.criado_em DESC`;

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return Response.json({ reservas: results });
}