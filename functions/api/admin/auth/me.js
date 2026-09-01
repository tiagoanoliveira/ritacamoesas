// functions/api/admin/auth/me.js
//
// GET /api/admin/auth/me
//
// Chamado pelo admin-guard.js em todas as páginas do dashboard para
// confirmar se a sessão ainda é válida. Não faz login nem logout —
// apenas lê e valida o cookie existente.

import { verificarCookieSessao } from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const sessao = await verificarCookieSessao(request, env);

  if (!sessao) {
    return new Response(
      JSON.stringify({ autenticado: false }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Sessão válida: devolver dados básicos do admin (nunca a password_hash)
  const admin = await env.DB.prepare(
    "SELECT id, email, nome FROM admins WHERE id = ? LIMIT 1"
  )
    .bind(sessao.adminId)
    .first();

  if (!admin) {
    // Admin foi removido da BD entretanto, apesar do cookie ainda ser válido
    return new Response(
      JSON.stringify({ autenticado: false }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ autenticado: true, admin }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}