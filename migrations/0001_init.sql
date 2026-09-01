-- migrations/0001_init.sql
-- Base de dados D1 (SQLite) para o website "Atelier by Rita"
-- Aplicar com: wrangler d1 migrations apply atelier-db

PRAGMA foreign_keys = ON;

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- bcrypt/argon2 hash, nunca texto simples
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- EVENTOS / WORKSHOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,       -- usado no URL /eventos/:slug
  titulo            TEXT NOT NULL,
  descricao         TEXT NOT NULL,               -- suporta markdown simples
  tematica          TEXT,                        -- ex: "Doçaria", "Cozinha Regional"
  duracao_minutos   INTEGER NOT NULL,
  data_evento       TEXT NOT NULL,                -- ISO 8601: 2026-09-20T15:00:00
  preco_centimos    INTEGER NOT NULL,             -- guardar em cêntimos evita erros de float
  vagas_max         INTEGER NOT NULL,
  vagas_ocupadas    INTEGER NOT NULL DEFAULT 0,   -- recalculado por trigger (ver abaixo)
  localizacao       TEXT NOT NULL DEFAULT 'Atelier by Rita — [morada completa]',
  localizacao_excecao INTEGER NOT NULL DEFAULT 0, -- 0 = morada padrão do atelier, 1 = morada custom
  reservas_abrem_em  TEXT,                        -- pode ser distinto da data de publicação
  reservas_fecham_em TEXT,                        -- pode ser distinto da data do evento
  estado            TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('rascunho','publicado','cancelado','concluido')),
  criado_em         TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado);

-- Imagens de cada evento (armazenadas no R2, aqui só a referência)
CREATE TABLE IF NOT EXISTS evento_imagens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,           -- ex: eventos/workshop-doces/1.jpg
  posicao     INTEGER NOT NULL DEFAULT 0,
  alt_text    TEXT
);

-- ============================================================
-- RESERVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS reservas (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo              TEXT NOT NULL UNIQUE,   -- código único, ex: RB-7F3A2K (usado na descrição do pagamento)
  evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE RESTRICT,
  nome                TEXT NOT NULL,
  email               TEXT NOT NULL,
  telefone            TEXT NOT NULL,
  num_pessoas         INTEGER NOT NULL DEFAULT 1,
  observacoes         TEXT,
  metodo_pagamento    TEXT CHECK (metodo_pagamento IN ('mbway','transferencia')),
  estado              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (estado IN ('pendente','confirmada','sem_pagamento','cancelada')),
  prazo_pagamento     TEXT NOT NULL,           -- criado_em + 24h
  confirmado_por      INTEGER REFERENCES admins(id),
  criado_em           TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservas_evento ON reservas(evento_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo);

-- Triggers para manter vagas_ocupadas sincronizado automaticamente
-- (conta apenas reservas 'pendente' ou 'confirmada' como RN04 exige)
CREATE TRIGGER IF NOT EXISTS trg_reserva_insert
AFTER INSERT ON reservas
WHEN NEW.estado IN ('pendente','confirmada')
BEGIN
  UPDATE eventos SET vagas_ocupadas = vagas_ocupadas + NEW.num_pessoas
  WHERE id = NEW.evento_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_reserva_update_para_cancelada
AFTER UPDATE ON reservas
WHEN OLD.estado IN ('pendente','confirmada')
 AND NEW.estado IN ('cancelada','sem_pagamento')
BEGIN
  UPDATE eventos SET vagas_ocupadas = vagas_ocupadas - OLD.num_pessoas
  WHERE id = NEW.evento_id;
END;

-- ============================================================
-- PEDIDOS DE ORÇAMENTO (eventos privados / workshops à medida)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos_orcamento (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL,
  telefone        TEXT NOT NULL,
  tipo_evento     TEXT NOT NULL,        -- ex: "Jantar privado", "Workshop empresa"
  num_pessoas     INTEGER NOT NULL,
  tematica        TEXT,                 -- opcional
  data_pretendida TEXT,                 -- opcional
  observacoes     TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','respondido','arquivado')),
  resposta_admin  TEXT,
  respondido_por  INTEGER REFERENCES admins(id),
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  respondido_em   TEXT
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_estado ON pedidos_orcamento(estado);