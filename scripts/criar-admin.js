// scripts/criar-admin.js
// Uso: node scripts/criar-admin.js

const readline = require("node:readline");
const crypto = require("node:crypto");
const fs = require("node:fs");

const ITERACOES = 100_000;
const TAMANHO_CHAVE = 32;
const DIGEST = "sha256";

function perguntar(rl, texto, { ocultar = false } = {}) {
  return new Promise((resolve) => {
    if (!ocultar) {
      rl.question(texto, (resposta) => resolve(resposta.trim()));
      return;
    }

    const stdin = process.stdin;
    process.stdout.write(texto);

    let valor = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      char = String(char);

      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(valor.trim());
        return;
      }

      if (char === "\u0003") {
        process.exit(1);
      }

      if (char === "\u007f") {
        valor = valor.slice(0, -1);
        return;
      }

      valor += char;
    };

    stdin.on("data", onData);
  });
}

function gerarHash(passwordPlano) {
  const sal = crypto.randomBytes(16);

  const chave = crypto.pbkdf2Sync(
    passwordPlano,
    sal,
    ITERACOES,
    TAMANHO_CHAVE,
    DIGEST
  );

  return `${sal.toString("hex")}:${chave.toString("hex")}`;
}

function escaparSql(valor) {
  return String(valor).replace(/'/g, "''");
}

async function principal() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("== Criar administrador — Atelier by Rita ==\n");

  const nome = await perguntar(rl, "Nome: ");
  const email = (
    await perguntar(rl, "Email: ")
  ).toLowerCase();

  const password = await perguntar(
    rl,
    "Password (mínimo 8 caracteres): ",
    { ocultar: true }
  );

  const confirmacao = await perguntar(
    rl,
    "Confirmar password: ",
    { ocultar: true }
  );

  rl.close();

  if (!nome || !email || !password) {
    console.error(
      "\nNome, email e password são obrigatórios."
    );
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("\nEmail inválido.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error(
      "\nA password deve ter pelo menos 8 caracteres."
    );
    process.exit(1);
  }

  if (password !== confirmacao) {
    console.error("\nAs passwords não coincidem.");
    process.exit(1);
  }

  const hash = gerarHash(password);

  const sql =
    `INSERT INTO admins (nome, email, password_hash)\n` +
    `VALUES ('${escaparSql(nome)}', '${escaparSql(
      email
    )}', '${escaparSql(hash)}')\n` +
    `ON CONFLICT(email) DO UPDATE SET\n` +
    `  nome = excluded.nome,\n` +
    `  password_hash = excluded.password_hash;\n`;

  const nomeFicheiro = `admin-${Date.now()}.sql`;
  fs.writeFileSync(nomeFicheiro, sql, "utf8");

  console.log(
    `\nFicheiro gerado: ${nomeFicheiro}`
  );

  console.log(
    "\nAplica na base de dados remota com:\n"
  );

  console.log(
    `  npx wrangler d1 execute atelier-rita-db --remote --file=${nomeFicheiro}\n`
  );

  console.log(
    "Para a base local (usada em `wrangler pages dev`):\n"
  );

  console.log(
    `  npx wrangler d1 execute atelier-rita-db --local --file=${nomeFicheiro}\n`
  );

  console.log(
    "Depois de confirmares o login, elimina o ficheiro .sql gerado (contém o hash da password)."
  );
}

principal();