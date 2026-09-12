// GET /api/admin/reservas
// Filtros aceites:
// ?evento_id=
// ?estado=pendente|confirmada|sem_pagamento|cancelada
// ?q=
// ?pagina=
// ?limite=

import { exigirSessaoAdmin } from "../../../_lib/auth.js";
import {
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const ESTADOS_RESERVA = new Set([
  "pendente",
  "confirmada",
  "sem_pagamento",
  "cancelada",
]);

function numeroInteiro(
  valor,
  predefinido,
  minimo,
  maximo,
) {
  const numero = Number(valor);

  if (!Number.isInteger(numero)) {
    return predefinido;
  }

  return Math.min(
    Math.max(numero, minimo),
    maximo,
  );
}

export async function onRequestGet({
  request,
  env,
}) {
  const admin = await exigirSessaoAdmin(
    request,
    env,
  );

  if (!admin) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401,
    );
  }

  const url = new URL(request.url);

  const estado = String(
    url.searchParams.get("estado") || "",
  )
    .trim()
    .toLowerCase();

  const eventoIdTexto = String(
    url.searchParams.get("evento_id") || "",
  ).trim();

  const pesquisa = String(
    url.searchParams.get("q") || "",
  )
    .trim()
    .slice(0, 100);

  const pagina = numeroInteiro(
    url.searchParams.get("pagina"),
    1,
    1,
    10_000,
  );

  const limite = numeroInteiro(
    url.searchParams.get("limite"),
    25,
    1,
    100,
  );

  const offset = (pagina - 1) * limite;

  if (estado && !ESTADOS_RESERVA.has(estado)) {
    return respostaErro(
      "O estado da reserva é inválido.",
      422,
    );
  }

  const eventoId = eventoIdTexto
    ? Number(eventoIdTexto)
    : null;

  if (
    eventoIdTexto &&
    (!Number.isInteger(eventoId) || eventoId <= 0)
  ) {
    return respostaErro(
      "O identificador do evento é inválido.",
      422,
    );
  }

  const condicoes = [];
  const valores = [];

  if (eventoId) {
    condicoes.push("r.evento_id = ?");
    valores.push(eventoId);
  }

  if (estado) {
    condicoes.push("r.estado = ?");
    valores.push(estado);
  }

  if (pesquisa) {
    condicoes.push(
      `(r.codigo LIKE ?
        OR r.nome LIKE ?
        OR r.email LIKE ?
        OR r.telefone LIKE ?
        OR e.titulo LIKE ?)`,
    );

    const termo = `%${pesquisa}%`;

    valores.push(
      termo,
      termo,
      termo,
      termo,
      termo,
    );
  }

  const where = condicoes.length
    ? `WHERE ${condicoes.join(" AND ")}`
    : "";

  const consulta = `
    SELECT
      r.id,
      r.codigo,
      r.evento_id,
      r.nome,
      r.email,
      r.telefone,
      r.num_pessoas,
      r.observacoes,
      r.metodo_pagamento,
      r.estado,
      r.prazo_pagamento,
      r.confirmado_por,
      r.criado_em,
      r.atualizado_em,

      e.titulo AS evento_titulo,
      e.data_evento AS evento_data,

      a.nome AS confirmado_por_nome

    FROM reservas r

    INNER JOIN eventos e
            ON e.id = r.evento_id

    LEFT JOIN admins a
           ON a.id = r.confirmado_por

    ${where}

    ORDER BY
      CASE r.estado
        WHEN 'pendente' THEN 1
        WHEN 'confirmada' THEN 2
        WHEN 'sem_pagamento' THEN 3
        WHEN 'cancelada' THEN 4
        ELSE 5
      END,
      datetime(r.prazo_pagamento) ASC,
      datetime(r.criado_em) DESC,
      r.id DESC

    LIMIT ? OFFSET ?
  `;

  const consultaTotal = `
    SELECT COUNT(*) AS total
      FROM reservas r
      INNER JOIN eventos e
              ON e.id = r.evento_id
    ${where}
  `;

  try {
    const [
      resultado,
      totalResultado,
    ] = await env.DB.batch([
      env.DB.prepare(consulta)
        .bind(...valores, limite, offset),

      env.DB.prepare(consultaTotal)
        .bind(...valores),
    ]);

    const total =
      totalResultado.results?.[0]?.total || 0;

    return respostaJson({
      sucesso: true,
      reservas: resultado.results || [],
      paginacao: {
        pagina,
        limite,
        total,
        total_paginas: Math.max(
          1,
          Math.ceil(total / limite),
        ),
      },
    });
  } catch (error) {
    console.error("Erro ao listar reservas:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível carregar as reservas.",
      500,
    );
  }
}