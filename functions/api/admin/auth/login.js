// functions/api/admin/auth/login.js
// POST /api/admin/auth/login

import {
  validarTurnstile,
} from "../../../_lib/turnstile.js";

import {
  verificarPassword,
  criarCookieSessao,
} from "../../../_lib/auth.js";

const MAX_TENTATIVAS = 5;
const JANELA_BLOQUEIO_MINUTOS = 15;

export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return respostaErro("Pedido inválido.", 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || "");
  const turnstileToken = body.turnstile_token;

  if (!email || !password) {
    return respostaErro(
      "Email e password são obrigatórios.",
      400
    );
  }

  const turnstileOk = await validarTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    request
  );

  if (!turnstileOk) {
    return respostaErro(
      "Verificação de segurança falhou. Tenta novamente.",
      400
    );
  }

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    "desconhecido";

  if (await estaBloqueado(env, ip)) {
    return respostaErro(
      `Demasiadas tentativas falhadas. Tenta novamente dentro de ${JANELA_BLOQUEIO_MINUTOS} minutos.`,
      429
    );
  }

  const admin = await env.DB.prepare(
    `SELECT id, email, password_hash, nome
       FROM admins
      WHERE email = ?
      LIMIT 1`
  )
    .bind(email)
    .first();

  const passwordValida = admin
    ? await verificarPassword(
        password,
        admin.password_hash
      )
    : false;

  if (!admin || !passwordValida) {
    await registarTentativaFalhada(env, ip);

    return respostaErro(
      "Email ou password incorretos.",
      401
    );
  }

  await limparTentativas(env, ip);

  const cookie = await criarCookieSessao(env, admin);

  return Response.json(
    {
      sucesso: true,
      admin: {
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
      },
    },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookie,
      },
    }
  );
}

async function estaBloqueado(env, ip) {
  const limite = new Date(
    Date.now() -
      JANELA_BLOQUEIO_MINUTOS * 60 * 1000
  ).toISOString();

  await env.DB.prepare(
    `DELETE FROM admin_login_attempts
      WHERE criado_em <= ?`
  )
    .bind(limite)
    .run();

  const resultado = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM admin_login_attempts
      WHERE ip = ?
        AND criado_em > ?`
  )
    .bind(ip, limite)
    .first();

  return (
    (resultado?.total ?? 0) >= MAX_TENTATIVAS
  );
}

async function registarTentativaFalhada(env, ip) {
  await env.DB.prepare(
    `INSERT INTO admin_login_attempts
       (ip, criado_em)
     VALUES (?, ?)`
  )
    .bind(ip, new Date().toISOString())
    .run();
}

async function limparTentativas(env, ip) {
  await env.DB.prepare(
    `DELETE FROM admin_login_attempts
      WHERE ip = ?`
  )
    .bind(ip)
    .run();
}

function respostaErro(mensagem, status) {
  return Response.json(
    {
      sucesso: false,
      erro: mensagem,
    },
    { status }
  );
}