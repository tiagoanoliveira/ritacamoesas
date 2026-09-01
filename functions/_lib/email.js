// functions/api/_lib/email.js
// Envio de emails transacionais via Resend REST API (sem SDK, para manter o
// bundle leve nas Pages Functions). Respeita o limite gratuito de 100/dia e
// 3000/mês referido no RT08 — todos os envios passam por aqui, o que facilita
// no futuro adicionar um contador/registo de envios se necessário.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

async function enviarEmail(env, { destinatario, assunto, html }) {
  const resposta = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Atelier by Rita <${env.EMAIL_FROM}>`,
      to: [destinatario],
      subject: assunto,
      html,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.text();
    console.error("Falha ao enviar email via Resend:", erro);
    throw new Error("Falha ao enviar email.");
  }
  return resposta.json();
}

// Wrapper HTML comum a todos os emails — visual consistente com o site
// (não usar o template genérico "botão azul + logo centrado" do Resend docs).
function moldura(conteudoHtml) {
  return `
  <div style="font-family: Georgia, serif; background:#F4E9DD; padding:32px;">
    <div style="max-width:560px; margin:0 auto; background:#FFFDF9; border:1px solid #E8C79E; padding:32px;">
      <p style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#A6612C; margin:0 0 8px;">
        Atelier by Rita
      </p>
      ${conteudoHtml}
      <hr style="border:none; border-top:1px solid #E8C79E; margin:24px 0;" />
      <p style="font-size:12px; color:#8C5A3C;">
        Este email foi enviado automaticamente. Para qualquer dúvida, contacte-nos
        através da <a href="https://ritacamoesas.pt/suporte" style="color:#A6612C;">página de suporte</a>.
      </p>
    </div>
  </div>`;
}

/**
 * Email enviado imediatamente após criação de reserva (RN02).
 * Contém: dados de pagamento, código único obrigatório e prazo de 24h.
 */
export async function enviarEmailConfirmacaoReserva(env, { destinatario, nome, codigo, evento, numPessoas, metodoPagamento, prazoPagamento }) {
  const dataFormatada = new Date(evento.data_evento).toLocaleString("pt-PT", {
    dateStyle: "full", timeStyle: "short",
  });
  const prazoFormatado = new Date(prazoPagamento).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
  const precoTotal = ((evento.preco_centimos * numPessoas) / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const dadosPagamento = metodoPagamento === "mbway"
    ? `<p><strong>Método:</strong> MB WAY<br><strong>Número:</strong> [PREENCHER NÚMERO MB WAY DO ATELIER]</p>`
    : `<p><strong>Método:</strong> Transferência bancária<br>
       <strong>IBAN:</strong> [PREENCHER IBAN]<br><strong>Titular:</strong> [PREENCHER NOME DO TITULAR]</p>`;

  const html = moldura(`
    <h2 style="color:#3B2314;">A sua reserva está quase confirmada, ${nome}!</h2>
    <p>Reservou <strong>${numPessoas}</strong> vaga(s) para:</p>
    <p style="font-size:18px; font-weight:bold; color:#3B2314;">${evento.titulo}</p>
    <p>📅 ${dataFormatada}<br>📍 ${evento.localizacao}</p>

    <div style="background:#F4E9DD; padding:16px; margin:16px 0; border-left:4px solid #A6612C;">
      <p style="margin:0;"><strong>Código único de reserva:</strong></p>
      <p style="font-size:22px; letter-spacing:2px; font-weight:bold; color:#A6612C; margin:4px 0;">${codigo}</p>
      <p style="margin:0; font-size:13px;">⚠️ Este código tem de ser incluído na <strong>descrição do pagamento</strong>, sem exceção.</p>
    </div>

    ${dadosPagamento}
    <p><strong>Valor total a pagar:</strong> ${precoTotal}</p>

    <p style="color:#A23B2E;"><strong>Prazo de pagamento:</strong> até ${prazoFormatado} (24 horas).
    Caso o pagamento não seja confirmado até esta data, a reserva poderá ser cancelada e a vaga
    disponibilizada novamente.</p>
  `);

  return enviarEmail(env, {
    destinatario,
    assunto: `Reserva ${codigo} — dados para pagamento`,
    html,
  });
}

/** Email enviado quando o Admin confirma o pagamento da reserva. */
export async function enviarEmailReservaConfirmada(env, { destinatario, nome, codigo, evento }) {
  const html = moldura(`
    <h2 style="color:#3B2314;">Reserva confirmada! 🎉</h2>
    <p>Olá ${nome}, o seu pagamento para a reserva <strong>${codigo}</strong> foi confirmado.</p>
    <p>Esperamo-la em <strong>${evento.titulo}</strong>, a ${new Date(evento.data_evento).toLocaleString("pt-PT", { dateStyle: "full", timeStyle: "short" })}.</p>
    <p>📍 ${evento.localizacao}</p>
  `);
  return enviarEmail(env, { destinatario, assunto: `Reserva ${codigo} confirmada`, html });
}

/** Email enviado quando o Admin marca a reserva como "sem_pagamento" (cancelamento). */
export async function enviarEmailReservaCancelada(env, { destinatario, nome, codigo, evento }) {
  const html = moldura(`
    <h2 style="color:#3B2314;">Reserva cancelada</h2>
    <p>Olá ${nome}, não foi possível confirmar o pagamento da reserva <strong>${codigo}</strong>
    dentro do prazo estipulado, pelo que a vaga foi libertada.</p>
    <p>Se ainda tiver interesse em participar em <strong>${evento.titulo}</strong>, pode efetuar uma nova reserva no site, sujeita a disponibilidade.</p>
  `);
  return enviarEmail(env, { destinatario, assunto: `Reserva ${codigo} cancelada`, html });
}

/** Email de resposta a um pedido de orçamento (US24). */
export async function enviarEmailRespostaOrcamento(env, { destinatario, nome, resposta, tipoEvento }) {
  const html = moldura(`
    <h2 style="color:#3B2314;">Resposta ao seu pedido de orçamento</h2>
    <p>Olá ${nome}, obrigada pelo interesse em ${tipoEvento}. Segue a nossa resposta:</p>
    <div style="background:#F4E9DD; padding:16px; margin:16px 0; white-space:pre-line;">${resposta}</div>
  `);
  return enviarEmail(env, { destinatario, assunto: "Resposta ao seu pedido de orçamento — Atelier by Rita", html });
}