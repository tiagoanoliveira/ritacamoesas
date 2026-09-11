// functions/media/eventos/[ficheiro].js
// GET /media/eventos/:ficheiro

export async function onRequestGet({
  env,
  params,
}) {
  return obterImagem(env, params, false);
}

export async function onRequestHead({
  env,
  params,
}) {
  return obterImagem(env, params, true);
}

async function obterImagem(
  env,
  params,
  apenasCabecalhos
) {
  if (!env.MEDIA) {
    return new Response(
      "Armazenamento indisponível.",
      { status: 503 }
    );
  }

  let ficheiro;

  try {
    ficheiro = decodeURIComponent(
      String(params.ficheiro || "")
    );
  } catch {
    return new Response(
      "Nome de ficheiro inválido.",
      { status: 400 }
    );
  }

  if (
    !/^[a-zA-Z0-9._-]+$/.test(ficheiro)
  ) {
    return new Response(
      "Nome de ficheiro inválido.",
      { status: 400 }
    );
  }

  const objeto = await env.MEDIA.get(
    `eventos/${ficheiro}`
  );

  if (!objeto) {
    return new Response(
      "Imagem não encontrada.",
      { status: 404 }
    );
  }

  const headers = new Headers();

  objeto.writeHttpMetadata(headers);

  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );

  headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  if (objeto.httpEtag) {
    headers.set("ETag", objeto.httpEtag);
  }

  return new Response(
    apenasCabecalhos ? null : objeto.body,
    {
      status: 200,
      headers,
    }
  );
}