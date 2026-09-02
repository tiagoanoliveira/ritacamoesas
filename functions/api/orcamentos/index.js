// functions/api/orcamentos/index.js
// POST /api/orcamentos — submissão pública de pedido de orçamento (US14)
// GET  /api/orcamentos — listagem para o dashboard (Admin, US24)

import { validarTurnstile } from "../../_lib/turnstile.js";
import { exigirSessaoAdmin } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const {
    nome, email, telefone, tipo_evento, num_pessoas,
    tematica, data_pretendida, observacoes, turnstile_token,
  } = body;

  const humano = await validarTurnstile(turnstile_token, env.TURNSTILE_SECRET_KEY, request);
  if (!humano) {
    return Response.json({ erro: "Falha na verificação anti-bot." }, { status: 400 });
  }

  const obrigatorios = { nome, email, telefone, tipo_evento, num_pessoas };
  for (const [campo, valor] of Object.entries(obrigatorios)) {
    if (!valor) return Response.json({ erro: `Campo obrigatório em falta: ${campo}` }, { status: 422 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ erro: "Email inválido." }, { status: 422 });
  }
  if (Number(num_pessoas) <= 0) {
    return Response.json({ erro: "Número de pessoas inválido." }, { status: 422 });
  }

  const resultado = await env.DB.prepare(
    `INSERT INTO pedidos_orcamento
       (nome, email, telefone, tipo_evento, num_pessoas, tematica, data_pretendida, observacoes, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`
  ).bind(
    nome, email, telefone, tipo_evento, Number(num_pessoas),
    tematica || null, data_pretendida || null, observacoes || null
  ).run();

  // Nota: não enviamos email automático de confirmação aqui para não gastar
  // a quota diária/mensal do Resend (RT08) em algo não crítico — a Rita
  // responde diretamente pelo dashboard e o cliente recebe o email nesse momento.
  // Se preferires um email automático de "pedido recebido", é simples de adicionar.

  return Response.json({
    sucesso: true,
    id: resultado.meta.last_row_id,
    mensagem: "Pedido de orçamento enviado com sucesso. Entraremos em contacto brevemente.",
  });
}

export async function onRequestGet({ request, env }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado");

  let query = `SELECT * FROM pedidos_orcamento WHERE 1=1`;
  const bindings = [];
  if (estado) { query += ` AND estado = ?`; bindings.push(estado); }
  query += ` ORDER BY criado_em DESC`;

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return Response.json({ pedidos: results });
}
