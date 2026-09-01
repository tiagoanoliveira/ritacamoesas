// functions/api/orcamentos/[id].js
// PUT /api/orcamentos/:id — Admin responde a um pedido de orçamento (US24)
// Marca o pedido como respondido e envia o email com a resposta ao cliente.

import { exigirSessaoAdmin } from "../_lib/auth.js";
import { enviarEmailRespostaOrcamento } from "../_lib/email.js";

export async function onRequestPut({ request, env, params }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const { resposta_admin, estado } = await request.json();
  if (!resposta_admin || !resposta_admin.trim()) {
    return Response.json({ erro: "A resposta não pode estar vazia." }, { status: 422 });
  }

  const pedido = await env.DB.prepare(`SELECT * FROM pedidos_orcamento WHERE id = ?`)
    .bind(params.id).first();
  if (!pedido) return Response.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const novoEstado = estado && ["respondido", "arquivado"].includes(estado) ? estado : "respondido";

  await env.DB.prepare(
    `UPDATE pedidos_orcamento
       SET resposta_admin = ?, estado = ?, respondido_por = ?, respondido_em = datetime('now')
     WHERE id = ?`
  ).bind(resposta_admin, novoEstado, admin.id, params.id).run();

  try {
    await enviarEmailRespostaOrcamento(env, {
      destinatario: pedido.email,
      nome: pedido.nome,
      resposta: resposta_admin,
      tipoEvento: pedido.tipo_evento,
    });
  } catch (erro) {
    // A resposta já foi guardada na BD mesmo que o email falhe — o Admin
    // pode reenviar manualmente ou o cliente pode consultar por telefone.
    console.error("Erro ao enviar email de resposta de orçamento:", erro);
    return Response.json({
      sucesso: true,
      aviso: "Resposta guardada, mas o email não pôde ser enviado. Verifique manualmente.",
    });
  }

  return Response.json({ sucesso: true });
}

// PATCH /api/orcamentos/:id — apenas mudar de estado (ex: arquivar sem responder)
export async function onRequestPatch({ request, env, params }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const { estado } = await request.json();
  if (!["pendente", "respondido", "arquivado"].includes(estado)) {
    return Response.json({ erro: "Estado inválido." }, { status: 422 });
  }

  await env.DB.prepare(`UPDATE pedidos_orcamento SET estado = ? WHERE id = ?`)
    .bind(estado, params.id).run();

  return Response.json({ sucesso: true });
}
