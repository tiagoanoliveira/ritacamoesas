// functions/api/admin/auth/me.js
// GET /api/admin/auth/me

import {
  exigirSessaoAdmin,
} from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const sessao = await exigirSessaoAdmin(
    request,
    env
  );

  if (!sessao) {
    return Response.json(
      { autenticado: false },
      { status: 401 }
    );
  }

  const admin = await env.DB.prepare(
    `SELECT id, email, nome
       FROM admins
      WHERE id = ?
      LIMIT 1`
  )
    .bind(sessao.id)
    .first();

  if (!admin) {
    return Response.json(
      { autenticado: false },
      { status: 401 }
    );
  }

  return Response.json({
    autenticado: true,
    admin,
  });
}