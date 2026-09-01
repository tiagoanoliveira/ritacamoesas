// functions/api/_lib/codigo.js
// Geração do código único de reserva (RN02).
// Formato: RB-XXXXXX (RB = "Reserva" + 6 caracteres alfanuméricos maiúsculos,
// sem caracteres ambíguos como 0/O ou 1/I/L) — fácil de ler e ditar por telefone,
// e obrigatório de incluir na descrição do pagamento.

const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0,1,I,O,L

export function gerarCodigoReserva() {
  let sufixo = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    sufixo += ALFABETO[b % ALFABETO.length];
  }
  return `RB-${sufixo}`;
}

// Código de verificação numérico de 6 dígitos, usado em RN03 (consulta/edição de
// reserva) quando é necessário confirmar o email do cliente por segurança.
export function gerarCodigoVerificacaoEmail() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const numero = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return numero.toString().padStart(6, "0");
}
