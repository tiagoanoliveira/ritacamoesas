// functions/api/_lib/turnstile.js
// Validação de tokens Cloudflare Turnstile — usado em /api/reservas e /api/orcamentos.

/**
 * Verifica um token do Turnstile junto da API da Cloudflare.
 * @param {string} token - valor de "cf-turnstile-response" enviado pelo formulário.
 * @param {string} secretKey - TURNSTILE_SECRET_KEY (variável secreta do wrangler).
 * @param {Request} request - request original, usada para obter o IP do cliente.
 * @returns {Promise<boolean>}
 */
export async function validarTurnstile(token, secretKey, request) {
  if (!token || !secretKey) return false;

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const corpo = new URLSearchParams();
  corpo.set("secret", secretKey);
  corpo.set("response", token);
  if (ip) corpo.set("remoteip", ip);

  try {
    const resposta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    });
    const dados = await resposta.json();
    return dados.success === true;
  } catch (erro) {
    console.error("Erro ao verificar Turnstile:", erro);
    return false; // em caso de dúvida, falha em segurança (bloqueia o pedido)
  }
}