// functions/api/_lib/auth.js
// Autenticação simples de Admin usando cookies de sessão assinados com HMAC
// (Web Crypto nativo do runtime Workers — sem dependências externas, cumpre RT05).
// Passwords guardadas com PBKDF2 (nunca texto simples nem hash fraco tipo MD5/SHA1 isolado).

const SESSION_COOKIE_NAME = "atelier_sessao";
const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8; // 8 horas

// ---------- Hash de password (registo/alteração de password do admin) ----------
export async function gerarHashPassword(passwordPlano) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const chave = await derivarChave(passwordPlano, sal);
  return `${bufferParaHex(sal)}:${bufferParaHex(chave)}`;
}

export async function verificarPassword(passwordPlano, hashGuardado) {
  const [salHex, chaveHex] = hashGuardado.split(":");
  const sal = hexParaBuffer(salHex);
  const chaveCalculada = await derivarChave(passwordPlano, sal);
  return bufferParaHex(chaveCalculada) === chaveHex;
}

async function derivarChave(passwordPlano, sal) {
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passwordPlano), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sal, iterations: 100_000, hash: "SHA-256" }, material, 256
  );
  return new Uint8Array(bits);
}

// ---------- Sessão (cookie assinado, sem armazenamento server-side extra) ----------
async function assinar(valor, segredo) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(valor));
  return bufferParaHex(new Uint8Array(assinatura));
}

export async function criarCookieSessao(env, admin) {
  const expiraEm = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS;
  const payload = `${admin.id}.${admin.email}.${expiraEm}`;
  const assinatura = await assinar(payload, env.JWT_SECRET);
  const valor = `${payload}.${assinatura}`;

  return `${NOME_COOKIE}=${encodeURIComponent(valor)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`;
}

export function cookieLogout() {
  return `${NOME_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Valida o cookie de sessão do pedido atual. Devolve { id, email } se válido,
 * ou null caso contrário — usar em todos os endpoints /api/admin/**.
 */
export async function exigirSessaoAdmin(request, env) {
  const cabecalhoCookie = request.headers.get("Cookie") || "";
  const match = cabecalhoCookie.match(new RegExp(`${NOME_COOKIE}=([^;]+)`));
  if (!match) return null;

  const valor = decodeURIComponent(match[1]);
  const partes = valor.split(".");
  if (partes.length !== 4) return null;
  const [id, email, expiraEm, assinaturaRecebida] = partes;

  const payload = `${id}.${email}.${expiraEm}`;
  const assinaturaEsperada = await assinar(payload, env.JWT_SECRET);
  if (assinaturaEsperada !== assinaturaRecebida) return null;
  if (Number(expiraEm) < Math.floor(Date.now() / 1000)) return null;

  return { id: Number(id), email };
}

// ---------- Utilitários hex ----------
function bufferParaHex(buffer) {
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexParaBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}