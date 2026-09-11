// functions/api/admin/eventos/upload.js
// POST   /api/admin/eventos/upload
// DELETE /api/admin/eventos/upload

import {
  exigirSessaoAdmin,
} from "../../../_lib/auth.js";

import {
  pedidoMesmoSite,
  respostaErro,
  respostaJson,
} from "../../../_lib/eventos.js";

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

const TIPOS_ACEITES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function onRequestPost({
  request,
  env,
}) {
  const sessao = await exigirSessaoAdmin(
    request,
    env
  );

  if (!sessao) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401
    );
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro(
      "Origem do pedido não autorizada.",
      403
    );
  }

  if (!env.MEDIA) {
    return respostaErro(
      "O armazenamento de imagens não está configurado.",
      500
    );
  }

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return respostaErro(
      "O pedido de upload é inválido.",
      400
    );
  }

  const imagem = formData.get("imagem");

  if (
    !imagem ||
    typeof imagem.arrayBuffer !== "function"
  ) {
    return respostaErro(
      "Seleciona uma imagem.",
      422
    );
  }

  if (!TIPOS_ACEITES.has(imagem.type)) {
    return respostaErro(
      "Formato não suportado. Usa JPEG, PNG, WebP ou AVIF.",
      415
    );
  }

  if (
    imagem.size <= 0 ||
    imagem.size > TAMANHO_MAXIMO
  ) {
    return respostaErro(
      "A imagem deve ter no máximo 5 MB.",
      413
    );
  }

  const conteudo = new Uint8Array(
    await imagem.arrayBuffer()
  );

  if (
    !assinaturaValida(
      conteudo,
      imagem.type
    )
  ) {
    return respostaErro(
      "O conteúdo do ficheiro não corresponde ao formato indicado.",
      415
    );
  }

  const extensao = TIPOS_ACEITES.get(
    imagem.type
  );

  const ficheiro =
    `${Date.now()}-${crypto.randomUUID()}` +
    `.${extensao}`;

  const chave = `eventos/${ficheiro}`;

  await env.MEDIA.put(
    chave,
    conteudo,
    {
      httpMetadata: {
        contentType: imagem.type,
        cacheControl:
          "public, max-age=31536000, immutable",
      },
      customMetadata: {
        nomeOriginal: String(
          imagem.name || "imagem"
        ).slice(0, 200),
        enviadoPor: String(sessao.id),
      },
    }
  );

  return respostaJson(
    {
      sucesso: true,
      chave,
      url:
        `/media/eventos/` +
        encodeURIComponent(ficheiro),
    },
    201
  );
}

export async function onRequestDelete({
  request,
  env,
}) {
  const sessao = await exigirSessaoAdmin(
    request,
    env
  );

  if (!sessao) {
    return respostaErro(
      "Sessão inválida ou expirada.",
      401
    );
  }

  if (!pedidoMesmoSite(request)) {
    return respostaErro(
      "Origem do pedido não autorizada.",
      403
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return respostaErro(
      "Pedido inválido.",
      400
    );
  }

  const chave = String(body.chave || "");

  if (
    !/^eventos\/[a-zA-Z0-9._-]+$/.test(chave)
  ) {
    return respostaErro(
      "Chave de imagem inválida.",
      422
    );
  }

  const ficheiro = chave.slice(
    "eventos/".length
  );

  const url =
    `/media/eventos/` +
    encodeURIComponent(ficheiro);

  const referencia =
    await env.DB.prepare(
      `SELECT id
         FROM eventos
        WHERE imagem_url = ?
        LIMIT 1`
    )
      .bind(url)
      .first();

  if (referencia) {
    return respostaErro(
      "A imagem continua associada a um evento.",
      409
    );
  }

  await env.MEDIA.delete(chave);

  return respostaJson({
    sucesso: true,
  });
}

function assinaturaValida(bytes, tipo) {
  if (tipo === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (tipo === "image/png") {
    const assinatura = [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ];

    return assinatura.every(
      (byte, indice) =>
        bytes[indice] === byte
    );
  }

  if (tipo === "image/webp") {
    return (
      textoAscii(bytes, 0, 4) === "RIFF" &&
      textoAscii(bytes, 8, 12) === "WEBP"
    );
  }

  if (tipo === "image/avif") {
    return (
      textoAscii(bytes, 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(
        textoAscii(bytes, 8, 12)
      )
    );
  }

  return false;
}

function textoAscii(bytes, inicio, fim) {
  return String.fromCharCode(
    ...bytes.slice(inicio, fim)
  );
}