// functions/api/reservas/[codigo].js
// POST /api/reservas/:codigo
// Consulta pública por código + email (RN03).

const FORMATO_CODIGO =
  /^RB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

const FORMATO_EMAIL =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({
  request,
  env,
  params,
}) {
  const codigo = String(params.codigo || "")
    .trim()
    .toUpperCase();

  let body;

  try {
    body = await request.json();
  } catch {
    return responderErro(
      "Pedido inválido.",
      400
    );
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);

  if (
    !FORMATO_CODIGO.test(codigo) ||
    !FORMATO_EMAIL.test(email)
  ) {
    return responderErro(
      "Código ou email inválido.",
      422
    );
  }

  const reserva = await env.DB.prepare(
    `SELECT
       r.codigo,
       r.nome,
       r.num_pessoas,
       r.metodo_pagamento,
       r.estado,
       r.prazo_pagamento,
       r.criado_em,
       e.titulo AS evento_titulo,
       e.data_evento,
       e.localizacao,
       e.preco_centimos
     FROM reservas r
     JOIN eventos e
       ON e.id = r.evento_id
     WHERE r.codigo = ?
       AND lower(r.email) = ?
     LIMIT 1`
  )
    .bind(codigo, email)
    .first();

  if (!reserva) {
    return responderErro(
      "Não encontrámos uma reserva com esse código e email.",
      404
    );
  }

  return Response.json(
    {
      reserva: {
        ...reserva,
        valor_total_centimos:
          reserva.preco_centimos *
          reserva.num_pessoas,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function responderErro(mensagem, status) {
  return Response.json(
    { erro: mensagem },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}