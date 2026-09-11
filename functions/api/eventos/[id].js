// GET /api/eventos/:slug — detalhe público por slug ou id

export async function onRequestGet({ env, params }) {
  const chave = String(params.id || "").trim();

  if (!chave) {
    return Response.json(
      { sucesso: false, erro: "Evento inválido." },
      { status: 400 },
    );
  }

  try {
    const evento = await env.DB.prepare(
      `SELECT
         id,
         slug,
         titulo,
         descricao,
         tematica,
         duracao_minutos,
         data_evento,
         preco_centimos,
         vagas_max,
         vagas_ocupadas,
         localizacao,
         localizacao_excecao,
         reservas_abrem_em,
         reservas_fecham_em,
         estado,
         imagem_url
       FROM eventos
       WHERE (slug = ? OR CAST(id AS TEXT) = ?)
         AND estado = 'publicado'
       LIMIT 1`,
    )
      .bind(chave, chave)
      .first();

    if (!evento) {
      return Response.json(
        { sucesso: false, erro: "Evento não encontrado." },
        { status: 404 },
      );
    }

    const agora = new Date();
    const dataEvento = new Date(evento.data_evento);
    const vagasDisponiveis = Math.max(
      0,
      evento.vagas_max - evento.vagas_ocupadas,
    );

    const reservasAbertas =
      dataEvento > agora &&
      vagasDisponiveis > 0 &&
      (!evento.reservas_abrem_em ||
        agora >= new Date(evento.reservas_abrem_em)) &&
      (!evento.reservas_fecham_em ||
        agora <= new Date(evento.reservas_fecham_em));

    return Response.json(
      {
        ...evento,
        vagas_disponiveis: vagasDisponiveis,
        reservas_abertas: reservasAbertas,
        imagens: evento.imagem_url
          ? [{ url: evento.imagem_url, alt: evento.titulo }]
          : [],
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Erro ao consultar evento público:", {
      message: error?.message,
      cause: error?.cause?.message,
      stack: error?.stack,
    });

    return Response.json(
      {
        sucesso: false,
        erro: "Não foi possível consultar o evento.",
      },
      { status: 500 },
    );
  }
}