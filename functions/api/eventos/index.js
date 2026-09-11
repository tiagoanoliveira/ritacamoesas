// GET /api/eventos — listagem pública

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const futuros = url.searchParams.get("futuros") === "1";
  const passados = url.searchParams.get("passados") === "1";
  const tematica = String(url.searchParams.get("tematica") || "")
    .trim()
    .slice(0, 120);
  const pesquisa = String(url.searchParams.get("pesquisa") || "")
    .trim()
    .slice(0, 100);

  const limitePedido = Number(url.searchParams.get("limite") || 12);
  const paginaPedido = Number(url.searchParams.get("pagina") || 1);
  const limite = Number.isInteger(limitePedido)
    ? Math.min(Math.max(limitePedido, 1), 50)
    : 12;
  const pagina = Number.isInteger(paginaPedido)
    ? Math.max(paginaPedido, 1)
    : 1;
  const offset = (pagina - 1) * limite;

  let query = `
    SELECT
      id,
      slug,
      titulo,
      tematica,
      data_evento,
      duracao_minutos,
      preco_centimos,
      vagas_max,
      vagas_ocupadas,
      localizacao,
      imagem_url
    FROM eventos
    WHERE estado = 'publicado'
  `;

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
    const termo = `%${pesquisa}%`;
    bindings.push(termo, termo);
  }

  query += `
    ORDER BY datetime(data_evento) ${passados ? "DESC" : "ASC"}
    LIMIT ? OFFSET ?
  `;
  bindings.push(limite, offset);

  try {
    const { results = [] } = await env.DB.prepare(query)
      .bind(...bindings)
      .all();

    const eventos = results.map((evento) => ({
      ...evento,
      vagas_disponiveis: Math.max(
        0,
        evento.vagas_max - evento.vagas_ocupadas,
      ),
      imagem_capa: evento.imagem_url || null,
    }));

    return Response.json(
      { eventos, pagina, limite },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao listar eventos públicos:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return Response.json(
      { sucesso: false, erro: "Não foi possível listar os eventos." },
      { status: 500 },
    );
  }
}