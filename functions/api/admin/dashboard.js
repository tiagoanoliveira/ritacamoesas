// GET /api/admin/dashboard
// Métricas e itens prioritários da área administrativa.

import { exigirSessaoAdmin } from "../../_lib/auth.js";
import {
  respostaErro,
  respostaJson,
} from "../../_lib/eventos.js";

export async function onRequestGet({
  request,
  env,
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

  try {
    const [
      reservasPendentes,
      reservasConfirmadas,
      orcamentosPendentes,
      eventosFuturos,
      proximasReservas,
      proximosEventos,
      ultimosOrcamentos,
    ] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS total
           FROM reservas
          WHERE estado = 'pendente'`,
      ),

      env.DB.prepare(
        `SELECT COUNT(*) AS total
           FROM reservas
          WHERE estado = 'confirmada'`,
      ),

      env.DB.prepare(
        `SELECT COUNT(*) AS total
           FROM pedidos_orcamento
          WHERE estado = 'pendente'`,
      ),

      env.DB.prepare(
        `SELECT COUNT(*) AS total
           FROM eventos
          WHERE estado = 'publicado'
            AND datetime(data_evento) >= datetime('now')`,
      ),

      env.DB.prepare(
        `SELECT
           r.id,
           r.codigo,
           r.nome,
           r.email,
           r.num_pessoas,
           r.estado,
           r.prazo_pagamento,
           r.criado_em,
           e.id AS evento_id,
           e.titulo AS evento_titulo,
           e.data_evento
         FROM reservas r
         INNER JOIN eventos e
                 ON e.id = r.evento_id
        WHERE r.estado = 'pendente'
        ORDER BY
          datetime(r.prazo_pagamento) ASC,
          datetime(r.criado_em) DESC
        LIMIT 5`,
      ),

      env.DB.prepare(
        `SELECT
           id,
           slug,
           titulo,
           data_evento,
           vagas_max,
           vagas_ocupadas,
           estado
         FROM eventos
        WHERE estado = 'publicado'
          AND datetime(data_evento) >= datetime('now')
        ORDER BY datetime(data_evento) ASC
        LIMIT 5`,
      ),

      env.DB.prepare(
        `SELECT
           id,
           nome,
           email,
           tipo_evento,
           num_pessoas,
           data_pretendida,
           estado,
           criado_em
         FROM pedidos_orcamento
        WHERE estado = 'pendente'
        ORDER BY datetime(criado_em) DESC
        LIMIT 5`,
      ),
    ]);

    return respostaJson({
      sucesso: true,

      metricas: {
        reservas_pendentes:
          reservasPendentes.results?.[0]?.total || 0,

        reservas_confirmadas:
          reservasConfirmadas.results?.[0]?.total || 0,

        orcamentos_pendentes:
          orcamentosPendentes.results?.[0]?.total || 0,

        eventos_futuros:
          eventosFuturos.results?.[0]?.total || 0,
      },

      proximas_reservas:
        proximasReservas.results || [],

      proximos_eventos:
        proximosEventos.results || [],

      ultimos_orcamentos:
        ultimosOrcamentos.results || [],
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível carregar o resumo administrativo.",
      500,
    );
  }
}