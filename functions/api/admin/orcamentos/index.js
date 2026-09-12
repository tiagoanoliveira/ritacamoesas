// GET /api/admin/orcamentos
// Filtros:
// ?estado=pendente|respondido|arquivado
// ?q=
// ?pagina=
// ?limite=

import { exigirSessaoAdmin } from "../../../_lib/auth.js";
import {
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const ESTADOS_ORCAMENTO = new Set([
  "pendente",
  "respondido",
  "arquivado",
]);

function inteiro(
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

  const pesquisa = String(
    url.searchParams.get("q") || "",
  )
    .trim()
    .slice(0, 100);

  const pagina = inteiro(
    url.searchParams.get("pagina"),
    1,
    1,
    10_000,
  );

  const limite = inteiro(
    url.searchParams.get("limite"),
    25,
    1,
    100,
  );

  if (estado && !ESTADOS_ORCAMENTO.has(estado)) {
    return respostaErro(
      "O estado do pedido é inválido.",
      422,
    );
  }

  const condicoes = [];
  const valores = [];

  if (estado) {
    condicoes.push("p.estado = ?");
    valores.push(estado);
  }

  if (pesquisa) {
    condicoes.push(
      `(p.nome LIKE ?
        OR p.email LIKE ?
        OR p.telefone LIKE ?
        OR p.tipo_evento LIKE ?
        OR p.tematica LIKE ?)`,
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

  const offset = (pagina - 1) * limite;

  const consulta = `
    SELECT
      p.id,
      p.nome,
      p.email,
      p.telefone,
      p.tipo_evento,
      p.num_pessoas,
      p.tematica,
      p.data_pretendida,
      p.observacoes,
      p.estado,
      p.resposta_admin,
      p.respondido_por,
      p.criado_em,
      p.respondido_em,
      a.nome AS respondido_por_nome
    FROM pedidos_orcamento p
    LEFT JOIN admins a
           ON a.id = p.respondido_por
    ${where}
    ORDER BY
      CASE p.estado
        WHEN 'pendente' THEN 1
        WHEN 'respondido' THEN 2
        WHEN 'arquivado' THEN 3
        ELSE 4
      END,
      datetime(p.criado_em) DESC,
      p.id DESC
    LIMIT ? OFFSET ?
  `;

  const consultaTotal = `
    SELECT COUNT(*) AS total
      FROM pedidos_orcamento p
    ${where}
  `;

  try {
    const [
      resultado,
      resultadoTotal,
    ] = await env.DB.batch([
      env.DB.prepare(consulta).bind(
        ...valores,
        limite,
        offset,
      ),

      env.DB.prepare(consultaTotal).bind(
        ...valores,
      ),
    ]);

    const total =
      resultadoTotal.results?.[0]?.total || 0;

    return respostaJson({
      sucesso: true,
      orcamentos: resultado.results || [],
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
    console.error("Erro ao listar orçamentos:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return respostaErro(
      "Não foi possível carregar os pedidos de orçamento.",
      500,
    );
  }
}