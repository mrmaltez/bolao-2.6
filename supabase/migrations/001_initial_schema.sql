-- ============================================================
-- Bolão Copa 2026 — Schema Inicial + RLS Policies
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');
CREATE TYPE match_stage AS ENUM ('group', 'round_of_16', 'quarter', 'semi', 'third_place', 'final');

-- ─── TABELAS ────────────────────────────────────────────────────────────────

-- Perfis de usuário (estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username          TEXT NOT NULL UNIQUE,
  full_name         TEXT,
  avatar_url        TEXT,
  palpite_campeao   TEXT,       -- Ex: "Brasil"
  palpite_final     TEXT,       -- Ex: "Brasil vs Argentina"
  pontos_total      INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Partidas da Copa do Mundo
CREATE TABLE IF NOT EXISTS public.matches (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  api_football_id   INTEGER UNIQUE,             -- ID na API-Football (para sincronização)
  round             TEXT NOT NULL,              -- Ex: "Rodada 1 - Grupo A"
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  home_team_flag    TEXT,                       -- URL da bandeira
  away_team_flag    TEXT,
  home_score        INTEGER,                    -- NULL até a partida terminar
  away_score        INTEGER,
  match_start_time  TIMESTAMPTZ NOT NULL,       -- Horário de início — chave para o deadline
  status            match_status NOT NULL DEFAULT 'scheduled',
  stage             match_stage NOT NULL DEFAULT 'group',
  group_name        TEXT,                       -- Ex: "Grupo A" (NULL para mata-mata)
  venue             TEXT                        -- Estádio
);

-- Palpites dos usuários
CREATE TABLE IF NOT EXISTS public.bets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score_bet    INTEGER NOT NULL CHECK (home_score_bet >= 0),
  away_score_bet    INTEGER NOT NULL CHECK (away_score_bet >= 0),
  pontos            INTEGER,                    -- Calculado após a partida

  UNIQUE (user_id, match_id)                   -- Um palpite por partida por usuário
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bets_user_id    ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id   ON public.bets(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_status  ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_stage   ON public.matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_start   ON public.matches(match_start_time);

-- ─── VIEWS ──────────────────────────────────────────────────────────────────

-- View de ranking com posição calculada
CREATE OR REPLACE VIEW public.ranking_view AS
SELECT
  p.id            AS user_id,
  p.username,
  p.avatar_url,
  p.pontos_total,
  RANK() OVER (ORDER BY p.pontos_total DESC) AS position
FROM public.profiles p
ORDER BY p.pontos_total DESC;

-- ─── FUNCTIONS & TRIGGERS ───────────────────────────────────────────────────

-- 1. Auto-criar perfil ao registrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_bets_updated_at
  BEFORE UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. REGRA CRÍTICA: Bloquear palpite após início da partida
--    Aplica-se tanto ao INSERT quanto ao UPDATE
CREATE OR REPLACE FUNCTION public.check_bet_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_start TIMESTAMPTZ;
BEGIN
  SELECT match_start_time
  INTO   v_match_start
  FROM   public.matches
  WHERE  id = NEW.match_id;

  IF v_match_start IS NULL THEN
    RAISE EXCEPTION 'Partida não encontrada.';
  END IF;

  IF NOW() >= v_match_start THEN
    RAISE EXCEPTION
      'Prazo de palpite encerrado. A partida começou em %.',
      TO_CHAR(v_match_start AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_bet_deadline
  BEFORE INSERT OR UPDATE ON public.bets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bet_deadline();

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────────────────────

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets     ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────

-- Qualquer usuário autenticado pode ver todos os perfis (necessário para ranking/palpites)
CREATE POLICY "Perfis visíveis para usuários autenticados"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuário só pode editar o próprio perfil
CREATE POLICY "Usuário edita apenas o próprio perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- O sistema (trigger) cria o perfil; usuário não insere diretamente
CREATE POLICY "Sistema cria perfil no cadastro"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── matches ───────────────────────────────────────────────────────────────

-- Qualquer usuário autenticado pode ver as partidas
CREATE POLICY "Partidas visíveis para usuários autenticados"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas service_role pode inserir/editar partidas (sync com API-Football)
-- (Sem policy de INSERT/UPDATE/DELETE = bloqueado para usuários comuns)

-- ── bets ──────────────────────────────────────────────────────────────────

-- Usuário autenticado pode ver TODOS os palpites (necessário para "Palpites da Rapaziada")
CREATE POLICY "Palpites visíveis para usuários autenticados"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuário só pode INSERIR o próprio palpite
-- (O trigger check_bet_deadline faz a verificação de horário)
CREATE POLICY "Usuário insere apenas o próprio palpite"
  ON public.bets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuário só pode ATUALIZAR o próprio palpite
-- (O trigger check_bet_deadline faz a verificação de horário)
CREATE POLICY "Usuário atualiza apenas o próprio palpite"
  ON public.bets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode deletar o próprio palpite (apenas se antes do início)
-- O trigger também bloqueia o delete indiretamente por conta do status
CREATE POLICY "Usuário deleta apenas o próprio palpite"
  ON public.bets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── GRANTS ─────────────────────────────────────────────────────────────────

-- Dar acesso à role anon e authenticated nas tabelas e views
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.ranking_view TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bets TO authenticated;

-- ─── DADOS DE EXEMPLO (seed para desenvolvimento) ────────────────────────────
-- Descomente para inserir partidas de exemplo:

/*
INSERT INTO public.matches (round, home_team, away_team, home_team_flag, away_team_flag, match_start_time, status, stage, group_name, venue)
VALUES
  ('Rodada 1', 'Brasil', 'Croácia',
   'https://flagcdn.com/w80/br.png', 'https://flagcdn.com/w80/hr.png',
   NOW() + INTERVAL '2 days', 'scheduled', 'group', 'Grupo D', 'MetLife Stadium, Nova York'),
  ('Rodada 1', 'Argentina', 'Islândia',
   'https://flagcdn.com/w80/ar.png', 'https://flagcdn.com/w80/is.png',
   NOW() + INTERVAL '2 days 3 hours', 'scheduled', 'group', 'Grupo A', 'Rose Bowl, Los Angeles'),
  ('Rodada 1', 'França', 'Alemanha',
   'https://flagcdn.com/w80/fr.png', 'https://flagcdn.com/w80/de.png',
   NOW() + INTERVAL '3 days', 'scheduled', 'group', 'Grupo B', 'AT&T Stadium, Dallas');
*/
