// functions/api/admin/auth/login.js
//
// POST /api/admin/auth/login
// Body esperado: { email, password, turnstileToken }
//
// Fluxo:
//   1. Valida o Turnstile (anti-bot)
//   2. Aplica limite de tentativas por IP (proteção brute-force básica)
//   3. Confirma email + password contra a tabela `admins`
//   4. Se válido, emite cookie de sessão HttpOnly assinado

import { validarTurnstile } from "../../_lib/turnstile.js";
import { verificarPassword, criarCookieSessao } from "../../_lib/auth.js";

const MAX_TENTATIVAS = 5;
const JANELA_BLOQUEIO_MINUTOS = 15;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return respostaErro("Pedido inválido.", 400);
  }

  const { email, password, turnstileToken } = body;

  if (!email || !password) {
    return respostaErro("Email e password são obrigatórios.", 400);
  }

  // 1. Anti-bot
  const turnstileOk = await validarTurnstile(turnstileToken, request, env);
  if (!turnstileOk) {
    return respostaErro("Verificação de segurança falhou. Tenta novamente.", 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "desconhecido";

  // 2. Limite de tentativas por IP
  const bloqueado = await estaBloqueado(env, ip);
  if (bloqueado) {
    return respostaErro(
      `Demasiadas tentativas falhadas. Tenta novamente dentro de ${JANELA_BLOQUEIO_MINUTOS} minutos.`,
      429
    );
  }

  // 3. Confirmar credenciais
  const admin = await env.DB.prepare(
    "SELECT id, email, password_hash, nome FROM admins WHERE email = ? LIMIT 1"
  )
    .bind(email.trim().toLowerCase())
    .first();

  const passwordValida = admin
    ? await verificarPassword(password, admin.password_hash)
    : false;

  if (!admin || !passwordValida) {
    await registarTentativaFalhada(env, ip);
    return respostaErro("Email ou password incorretos.", 401);
  }

  // Login bem-sucedido: limpar tentativas anteriores deste IP
  await limparTentativas(env, ip);

  // 4. Emitir cookie de sessão
  const cookie = await criarCookieSessao(
    { adminId: admin.id, email: admin.email },
    env
  );

  return new Response(
    JSON.stringify({
      sucesso: true,
      admin: { id: admin.id, email: admin.email, nome: admin.nome },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }
  );
}

// --- Helpers de rate limiting (tabela admin_login_attempts na D1) ---

async function estaBloqueado(env, ip) {
  const janela = new Date(
    Date.now() - JANELA_BLOQUEIO_MINUTOS * 60 * 1000
  ).toISOString();

  const resultado = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM admin_login_attempts
     WHERE ip = ? AND criado_em > ?`
  )
    .bind(ip, janela)
    .first();

  return (resultado?.total ?? 0) >= MAX_TENTATIVAS;
}

async function registarTentativaFalhada(env, ip) {
  await env.DB.prepare(
    "INSERT INTO admin_login_attempts (ip, criado_em) VALUES (?, ?)"
  )
    .bind(ip, new Date().toISOString())
    .run();
}

async function limparTentativas(env, ip) {
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip = ?")
    .bind(ip)
    .run();
}

function respostaErro(mensagem, status) {
  return new Response(JSON.stringify({ sucesso: false, erro: mensagem }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}