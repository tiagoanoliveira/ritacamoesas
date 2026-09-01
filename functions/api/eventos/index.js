// functions/api/eventos/index.js
// GET /api/eventos — listagem pública de eventos (US11)
// Suporta filtros: ?futuros=1&passados=1&tematica=&pesquisa=&limite=&pagina=
//
// POST /api/eventos — criar evento (só Admin, US22)

import { exigirSessaoAdmin } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const futuros = url.searchParams.get("futuros");
  const passados = url.searchParams.get("passados");
  const tematica = url.searchParams.get("tematica");
  const pesquisa = url.searchParams.get("pesquisa");
  const limite = Math.min(Number(url.searchParams.get("limite") || 12), 50);
  const pagina = Math.max(Number(url.searchParams.get("pagina") || 1), 1);
  const offset = (pagina - 1) * limite;

  let query = `SELECT id, slug, titulo, tematica, data_evento, duracao_minutos,
                      preco_centimos, vagas_max, vagas_ocupadas, localizacao
               FROM eventos
               WHERE estado = 'publicado'`;
  const bindings = [];

  if (futuros && !passados) {
    query += ` AND datetime(data_evento) >= datetime('now')`;
  } else if (passados && !futuros) {
    query += ` AND datetime(data_evento) < datetime('now')`;
  }
  if (tematica) {
    query += ` AND tematica = ?`;
    bindings.push(tematica);
  }
  if (pesquisa) {
    query += ` AND (titulo LIKE ? OR descricao LIKE ?)`;
    bindings.push(`%${pesquisa}%`, `%${pesquisa}%`);
  }

  query += ` ORDER BY datetime(data_evento) ${passados ? "DESC" : "ASC"} LIMIT ? OFFSET ?`;
  bindings.push(limite, offset);

  const { results } = await env.DB.prepare(query).bind(...bindings).all();

  // Buscar a imagem de capa (posicao = 0) de cada evento numa segunda query
  const ids = results.map((e) => e.id);
  let capas = {};
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const { results: imgs } = await env.DB.prepare(
      `SELECT evento_id, r2_key FROM evento_imagens WHERE evento_id IN (${placeholders}) AND posicao = 0`
    ).bind(...ids).all();
    capas = Object.fromEntries(imgs.map((i) => [i.evento_id, i.r2_key]));
  }

  const eventos = results.map((e) => ({
    ...e,
    vagas_disponiveis: e.vagas_max - e.vagas_ocupadas,
    imagem_capa: capas[e.id] ? `/media/${capas[e.id]}` : null,
  }));

  return Response.json({ eventos, pagina, limite });
}

export async function onRequestPost({ request, env }) {
  const admin = await exigirSessaoAdmin(request, env);
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const b = await request.json();
  const campos = [
    "slug", "titulo", "descricao", "tematica", "duracao_minutos", "data_evento",
    "preco_centimos", "vagas_max", "localizacao", "localizacao_excecao",
    "reservas_abrem_em", "reservas_fecham_em", "estado",
  ];
  for (const c of ["slug", "titulo", "descricao", "duracao_minutos", "data_evento", "preco_centimos", "vagas_max"]) {
    if (b[c] === undefined || b[c] === null || b[c] === "") {
      return Response.json({ erro: `Campo obrigatório em falta: ${c}` }, { status: 422 });
    }
  }

  const valores = campos.map((c) => b[c] ?? null);
  const placeholders = campos.map(() => "?").join(",");

  try {
    const resultado = await env.DB.prepare(
      `INSERT INTO eventos (${campos.join(",")}) VALUES (${placeholders})`
    ).bind(...valores).run();
    return Response.json({ sucesso: true, id: resultado.meta.last_row_id });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return Response.json({ erro: "Já existe um evento com este slug." }, { status: 409 });
    }
    return Response.json({ erro: "Erro ao criar evento." }, { status: 500 });
  }
}