// public/js/reserva-consultar.js
// Consulta de reserva por código + email (RN03).

const form = document.getElementById(
  "form-consulta-reserva"
);

const erroEl = document.getElementById(
  "erro-consulta"
);

const resultadoEl = document.getElementById(
  "resultado-consulta"
);

const codigoInput = document.getElementById(
  "codigo"
);

const codigoUrl = new URLSearchParams(
  window.location.search
).get("codigo");

if (codigoUrl) {
  codigoInput.value = codigoUrl
    .trim()
    .toUpperCase();
}

const estados = {
  pendente: "A aguardar pagamento",
  confirmada: "Confirmada",
  sem_pagamento:
    "Cancelada por falta de pagamento",
  cancelada: "Cancelada",
};

form.addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    erroEl.hidden = true;
    resultadoEl.hidden = true;

    if (!form.reportValidity()) {
      return;
    }

    const botao = form.querySelector(
      "button[type=submit]"
    );

    const codigo = codigoInput.value
      .trim()
      .toUpperCase();

    const email = document
      .getElementById("email")
      .value.trim()
      .toLowerCase();

    botao.disabled = true;
    botao.textContent = "A consultar…";

    try {
      const resposta = await fetch(
        `/api/reservas/${encodeURIComponent(
          codigo
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarErro(
          dados.erro ||
            "Não foi possível consultar a reserva."
        );

        return;
      }

      renderizarReserva(dados.reserva);
    } catch {
      mostrarErro(
        "Erro de ligação. Tenta novamente."
      );
    } finally {
      botao.disabled = false;
      botao.textContent = "Consultar reserva";
    }
  }
);

function renderizarReserva(reserva) {
  document.getElementById(
    "reserva-codigo"
  ).textContent = reserva.codigo;

  document.getElementById(
    "reserva-estado"
  ).textContent =
    estados[reserva.estado] || reserva.estado;

  document.getElementById(
    "reserva-evento"
  ).textContent = reserva.evento_titulo;

  document.getElementById(
    "reserva-data"
  ).textContent = formatarData(
    reserva.data_evento
  );

  document.getElementById(
    "reserva-local"
  ).textContent = reserva.localizacao;

  document.getElementById(
    "reserva-nome"
  ).textContent = reserva.nome;

  document.getElementById(
    "reserva-pessoas"
  ).textContent = String(reserva.num_pessoas);

  document.getElementById(
    "reserva-pagamento"
  ).textContent =
    reserva.metodo_pagamento === "mbway"
      ? "MB WAY"
      : "Transferência bancária";

  document.getElementById(
    "reserva-total"
  ).textContent = formatarPreco(
    reserva.valor_total_centimos
  );

  document.getElementById(
    "reserva-prazo"
  ).textContent = formatarData(
    reserva.prazo_pagamento
  );

  const aviso = document.getElementById(
    "aviso-pagamento"
  );

  aviso.hidden = reserva.estado !== "pendente";
  resultadoEl.hidden = false;
  resultadoEl.focus();
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.hidden = false;
  erroEl.focus();
}

function formatarData(valor) {
  return new Date(valor).toLocaleString(
    "pt-PT",
    {
      dateStyle: "long",
      timeStyle: "short",
    }
  );
}

function formatarPreco(centimos) {
  return (centimos / 100).toLocaleString(
    "pt-PT",
    {
      style: "currency",
      currency: "EUR",
    }
  );
}