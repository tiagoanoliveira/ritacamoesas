// functions/api/eventos/[id].js
// GET  /api/eventos/:slug  -> detalhe público de um evento (US12), aceita slug OU id
// PUT  /api/eventos/:id    -> editar evento (Admin, US22)
// DELETE /api/eventos/:id  -> remover evento (Admin, US22)

import { exigirSessaoAdmin } from "../../_lib/auth.js";

export async function onRequestGet({ env, params }) {
  const chave = params.id;
  const evento = await env.DB.prepare(
    `SELECT * FROM eventos WHERE (slug = ? OR CAST(id AS TEXT) = ?) AND estado = 'publicado'`
  ).bind(chave, chave).first();

  if (!evento) return Response.json({ erro: "Evento não encontrado." }, { status: 404 });

  const { results: imagens } = await env.DB.prepare(
    `SELECT r2_key, alt_text, posicao FROM evento_imagens WHERE evento_id = ? ORDER BY posicao ASC`
  ).bind(evento.id).all();

  const agora = new Date();
  const reservasAbertas =
    (!evento.reservas_abrem_em || agora >= new Date(evento.reservas_abrem_em)) &&
    (!evento.reservas_fecham_em || agora <= new Date(evento.reservas_fecham_em));

  return Response.json({
    ...evento,
    vagas_disponiveis: evento.vagas_max - evento.vagas_ocupadas,
    reservas_abertas: reservasAbertas,
    imagens: imagens.map((i) => ({ url: `/media/${i.r2_key}`, alt: i.alt_text })),
  });
}

export async function onRequestPut({ request, env, params }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const b = await request.json();
  const campos = [
    "titulo", "descricao", "tematica", "duracao_minutos", "data_evento",
    "preco_centimos", "vagas_max", "localizacao", "localizacao_excecao",
    "reservas_abrem_em", "reservas_fecham_em", "estado",
  ];
  const definicoes = campos.filter((c) => b[c] !== undefined);
  if (!definicoes.length) return Response.json({ erro: "Nada para atualizar." }, { status: 422 });

  const set = definicoes.map((c) => `${c} = ?`).join(", ");
  const valores = definicoes.map((c) => b[c]);

  await env.DB.prepare(
    `UPDATE eventos SET ${set}, atualizado_em = datetime('now') WHERE id = ?`
  ).bind(...valores, params.id).run();

  return Response.json({ sucesso: true });
}

export async function onRequestDelete({ request, env, params }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const reservasAtivas = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM reservas WHERE evento_id = ? AND estado IN ('pendente','confirmada')`
  ).bind(params.id).first();

  if (reservasAtivas.n > 0) {
    return Response.json(
      { erro: "Este evento tem reservas ativas. Cancele-as antes de eliminar, ou marque o evento como 'cancelado'." },
      { status: 409 }
    );
  }

  await env.DB.prepare(`DELETE FROM eventos WHERE id = ?`).bind(params.id).run();
  return Response.json({ sucesso: true });
}