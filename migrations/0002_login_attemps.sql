-- migrations/0002_login_attempts.sql
-- Suporte ao rate limiting do login administrativo.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  criado_em  TEXT NOT NULL
             DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS
  idx_admin_login_attempts_ip_criado_em
ON admin_login_attempts (ip, criado_em);