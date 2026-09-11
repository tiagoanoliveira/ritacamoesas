PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE eventos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,       
  titulo            TEXT NOT NULL,
  descricao         TEXT NOT NULL,               
  tematica          TEXT,                        
  duracao_minutos   INTEGER NOT NULL,
  data_evento       TEXT NOT NULL,                
  preco_centimos    INTEGER NOT NULL,             
  vagas_max         INTEGER NOT NULL,
  vagas_ocupadas    INTEGER NOT NULL DEFAULT 0,   
  localizacao       TEXT NOT NULL DEFAULT 'Atelier by Rita — [morada completa]',
  localizacao_excecao INTEGER NOT NULL DEFAULT 0, 
  reservas_abrem_em  TEXT,                        
  reservas_fecham_em TEXT,                        
  estado            TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('rascunho','publicado','cancelado','concluido')),
  criado_em         TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now'))
, imagem_url TEXT);
CREATE TABLE reservas (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo              TEXT NOT NULL UNIQUE,   
  evento_id           INTEGER NOT NULL REFERENCES eventos(id) ON DELETE RESTRICT,
  nome                TEXT NOT NULL,
  email               TEXT NOT NULL,
  telefone            TEXT NOT NULL,
  num_pessoas         INTEGER NOT NULL DEFAULT 1,
  observacoes         TEXT,
  metodo_pagamento    TEXT CHECK (metodo_pagamento IN ('mbway','transferencia')),
  estado              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (estado IN ('pendente','confirmada','sem_pagamento','cancelada')),
  prazo_pagamento     TEXT NOT NULL,           
  confirmado_por      INTEGER REFERENCES admins(id),
  criado_em           TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE pedidos_orcamento (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL,
  telefone        TEXT NOT NULL,
  tipo_evento     TEXT NOT NULL,        
  num_pessoas     INTEGER NOT NULL,
  tematica        TEXT,                 
  data_pretendida TEXT,                 
  observacoes     TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','respondido','arquivado')),
  resposta_admin  TEXT,
  respondido_por  INTEGER REFERENCES admins(id),
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  respondido_em   TEXT
);
CREATE TABLE admin_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  criado_em  TEXT NOT NULL
             DEFAULT (datetime('now'))
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_eventos_data ON eventos(data_evento);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_reservas_evento ON reservas(evento_id);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_codigo ON reservas(codigo);
CREATE INDEX idx_orcamentos_estado ON pedidos_orcamento(estado);
CREATE INDEX idx_admin_login_attempts_ip_criado_em
ON admin_login_attempts (ip, criado_em);
CREATE TRIGGER trg_reserva_insert
AFTER INSERT ON reservas
WHEN NEW.estado IN ('pendente','confirmada')
BEGIN
  UPDATE eventos SET vagas_ocupadas = vagas_ocupadas + NEW.num_pessoas
  WHERE id = NEW.evento_id;
END;
CREATE TRIGGER trg_reserva_update_para_cancelada
AFTER UPDATE ON reservas
WHEN OLD.estado IN ('pendente','confirmada')
 AND NEW.estado IN ('cancelada','sem_pagamento')
BEGIN
  UPDATE eventos SET vagas_ocupadas = vagas_ocupadas - OLD.num_pessoas
  WHERE id = NEW.evento_id;
END;
