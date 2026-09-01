// functions/api/admin/auth/logout.js
//
// POST /api/admin/auth/logout
//
// Único objetivo: expirar o cookie de sessão do admin.
// Não precisa de validar a sessão atual — mesmo que já esteja inválida,
// expirar de novo não tem efeitos secundários.

import { SESSION_COOKIE_NAME } from "../../../_lib/auth.js";

export async function onRequestPost() {
  const cookieExpirado = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0", // instrui o browser a remover o cookie imediatamente
  ].join("; ");

  return new Response(JSON.stringify({ sucesso: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieExpirado,
    },
  });
}