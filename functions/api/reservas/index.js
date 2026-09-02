// functions/api/reservas/index.js
// POST /api/reservas
// Criação pública de uma reserva (US13/RN02/RN04/RN05).

import {
  gerarCodigoReserva,
} from "../../_lib/codigo.js";

import {
  enviarEmailConfirmacaoReserva,
} from "../../_lib/email.js";

import {
  validarTurnstile,
} from "../../_lib/turnstile.js";

const METODOS_PAGAMENTO = new Set([
  "mbway",
  "transferencia",
]);

const FORMATO_EMAIL =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({
  request,
  env,
}) {
  let body;

  try {
    body = await request.json();
  } catch {
    return responderErro("Pedido inválido.", 400);
  }

  const eventoId = Number(body.evento_id);
  const nome = texto(body.nome, 120);
  const email = texto(body.email, 254)
    .toLowerCase();
  const telefone = texto(body.telefone, 40);
  const numPessoas = Number(body.num_pessoas);
  const metodoPagamento = texto(
    body.metodo_pagamento,
    30
  );
  const observacoes =
    texto(body.observacoes, 2000) || null;

  if (
    !Number.isInteger(eventoId) ||
    eventoId <= 0
  ) {
    return responderErro(
      "Evento inválido.",
      422
    );
  }

  if (!nome || !email || !telefone) {
    return responderErro(
      "Preenche nome, email e telefone.",
      422
    );
  }

  if (!FORMATO_EMAIL.test(email)) {
    return responderErro(
      "Email inválido.",
      422
    );
  }

  if (
    !Number.isInteger(numPessoas) ||
    numPessoas < 1 ||
    numPessoas > 20
  ) {
    return responderErro(
      "Número de pessoas inválido.",
      422
    );
  }

  if (
    !METODOS_PAGAMENTO.has(metodoPagamento)
  ) {
    return responderErro(
      "Método de pagamento inválido.",
      422
    );
  }

  const humano = await validarTurnstile(
    body.turnstile_token,
    env.TURNSTILE_SECRET_KEY,
    request
  );

  if (!humano) {
    return responderErro(
      "Falha na verificação anti-bot. Atualiza a verificação e tenta novamente.",
      400
    );
  }

  const evento = await env.DB.prepare(
    `SELECT id, titulo, data_evento,
            localizacao, preco_centimos
       FROM eventos
      WHERE id = ?
        AND estado = 'publicado'`
  )
    .bind(eventoId)
    .first();

  if (!evento) {
    return responderErro(
      "Evento não encontrado.",
      404
    );
  }

  const horasConfiguradas = Number.parseInt(
    env.RESERVA_PRAZO_HORAS || "24",
    10
  );

  const prazoHoras =
    Number.isFinite(horasConfiguradas) &&
    horasConfiguradas > 0
      ? horasConfiguradas
      : 24;

  const prazoPagamento = new Date(
    Date.now() +
      prazoHoras * 60 * 60 * 1000
  ).toISOString();

  let codigo;
  let criada = false;

  for (
    let tentativa = 0;
    tentativa < 5 && !criada;
    tentativa += 1
  ) {
    codigo = gerarCodigoReserva();

    try {
      const resultado = await env.DB.prepare(
        `INSERT INTO reservas
           (
             codigo,
             evento_id,
             nome,
             email,
             telefone,
             num_pessoas,
             observacoes,
             metodo_pagamento,
             estado,
             prazo_pagamento
           )
         SELECT
           ?,
           e.id,
           ?,
           ?,
           ?,
           ?,
           ?,
           ?,
           'pendente',
           ?
         FROM eventos e
         WHERE e.id = ?
           AND e.estado = 'publicado'
           AND datetime(e.data_evento) >
               datetime('now')
           AND (
             e.reservas_abrem_em IS NULL
             OR datetime(e.reservas_abrem_em) <=
                datetime('now')
           )
           AND (
             e.reservas_fecham_em IS NULL
             OR datetime(e.reservas_fecham_em) >=
                datetime('now')
           )
           AND e.vagas_ocupadas + ? <=
               e.vagas_max`
      )
        .bind(
          codigo,
          nome,
          email,
          telefone,
          numPessoas,
          observacoes,
          metodoPagamento,
          prazoPagamento,
          eventoId,
          numPessoas
        )
        .run();

      criada =
        (resultado.meta?.changes ?? 0) === 1;

      if (!criada) {
        break;
      }
    } catch (error) {
      const mensagem = String(
        error?.message || error
      );

      if (!mensagem.includes("UNIQUE")) {
        throw error;
      }
    }
  }

  if (!criada) {
    return responderErro(
      "As reservas estão fechadas ou já não existem vagas suficientes.",
      409
    );
  }

  let emailEnviado = true;

  try {
    await enviarEmailConfirmacaoReserva(env, {
      destinatario: email,
      nome,
      codigo,
      evento,
      numPessoas,
      metodoPagamento,
      prazoPagamento,
    });
  } catch (error) {
    emailEnviado = false;

    console.error(
      "Reserva criada, mas o email não foi enviado:",
      error
    );
  }

  return Response.json(
    {
      sucesso: true,
      codigo,
      prazo_pagamento: prazoPagamento,
      email_enviado: emailEnviado,
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function texto(valor, maximo) {
  return typeof valor === "string"
    ? valor.trim().slice(0, maximo)
    : "";
}

function responderErro(mensagem, status) {
  return Response.json(
    {
      sucesso: false,
      erro: mensagem,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}