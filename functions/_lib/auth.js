// functions/_lib/auth.js
// Autenticação do Admin com passwords PBKDF2 e cookies de sessão HMAC.

export const SESSION_COOKIE_NAME = "atelier_sessao";
const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;

export async function gerarHashPassword(passwordPlano) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const chave = await derivarChave(passwordPlano, sal);

  return `${bufferParaHex(sal)}:${bufferParaHex(chave)}`;
}

export async function verificarPassword(passwordPlano, hashGuardado) {
  if (
    !passwordPlano ||
    !hashGuardado ||
    !hashGuardado.includes(":")
  ) {
    return false;
  }

  const [salHex, chaveHex] = hashGuardado.split(":");
  const sal = hexParaBuffer(salHex);
  const chaveCalculada = await derivarChave(passwordPlano, sal);

  return comparacaoConstante(
    new TextEncoder().encode(bufferParaHex(chaveCalculada)),
    new TextEncoder().encode(chaveHex)
  );
}

async function derivarChave(passwordPlano, sal) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passwordPlano),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: sal,
      iterations: 100_000,
      hash: "SHA-256",
    },
    material,
    256
  );

  return new Uint8Array(bits);
}

async function assinar(valor, segredo) {
  if (!segredo) {
    throw new Error("JWT_SECRET não está configurado.");
  }

  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(valor)
  );

  return bufferParaHex(new Uint8Array(assinatura));
}

export async function criarCookieSessao(env, admin) {
  const expiraEm =
    Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS;

  const payload = codificarBase64Url(
    JSON.stringify({
      id: admin.id,
      email: admin.email,
      expiraEm,
    })
  );

  const assinatura = await assinar(payload, env.JWT_SECRET);
  const valor = `${payload}.${assinatura}`;

  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(valor)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${DURACAO_SESSAO_SEGUNDOS}`,
  ].join("; ");
}

export function cookieLogout() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export async function exigirSessaoAdmin(request, env) {
  const cabecalhoCookie = request.headers.get("Cookie") || "";

  const cookies = Object.fromEntries(
    cabecalhoCookie
      .split(";")
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const separador = parte.indexOf("=");

        return separador === -1
          ? [parte, ""]
          : [
              parte.slice(0, separador),
              parte.slice(separador + 1),
            ];
      })
  );

  const valorCodificado = cookies[SESSION_COOKIE_NAME];

  if (!valorCodificado) {
    return null;
  }

  let valor;

  try {
    valor = decodeURIComponent(valorCodificado);
  } catch {
    return null;
  }

  const partes = valor.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [payload, assinaturaRecebida] = partes;
  const assinaturaEsperada = await assinar(
    payload,
    env.JWT_SECRET
  );

  const assinaturaValida = comparacaoConstante(
    new TextEncoder().encode(assinaturaEsperada),
    new TextEncoder().encode(assinaturaRecebida)
  );

  if (!assinaturaValida) {
    return null;
  }

  let dados;

  try {
    dados = JSON.parse(descodificarBase64Url(payload));
  } catch {
    return null;
  }

  if (
    !Number.isInteger(dados.id) ||
    typeof dados.email !== "string" ||
    !Number.isInteger(dados.expiraEm)
  ) {
    return null;
  }

  if (dados.expiraEm < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: dados.id,
    email: dados.email,
  };
}

function codificarBase64Url(valor) {
  const bytes = new TextEncoder().encode(valor);
  let binario = "";

  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }

  return btoa(binario)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function descodificarBase64Url(valor) {
  const base64 = valor
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(valor.length / 4) * 4, "=");

  const binario = atob(base64);
  const bytes = Uint8Array.from(
    binario,
    (caractere) => caractere.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function comparacaoConstante(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let diferenca = 0;

  for (let i = 0; i < a.length; i += 1) {
    diferenca |= a[i] ^ b[i];
  }

  return diferenca === 0;
}

function bufferParaHex(buffer) {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexParaBuffer(hex) {
  if (
    !/^[0-9a-f]+$/i.test(hex) ||
    hex.length % 2 !== 0
  ) {
    return new Uint8Array();
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(
      hex.slice(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}