-- =====================================================================
-- CONTROLE DE USUÁRIOS — papéis (admin/operador) + RLS real
-- =====================================================================
-- Projeto: Supabase do Campaign Creator Hub  ·  schema facebook_ads_manager
-- Rodar no SQL Editor do Supabase, do início ao fim, UMA vez.
--
-- O QUE MUDA
--   Hoje toda tabela tem a policy `FOR ALL TO authenticated USING (true)`:
--   qualquer usuário logado lê e escreve tudo, inclusive os tokens das BMs.
--   Depois disto:
--     - admin    → tudo
--     - operador → lê tudo; escreve só campanha/conjunto/anúncio/execução/template
--     - inativo  → não lê nada
--
-- ATENÇÃO
--   1. Escrita em produção. Fazer backup antes (Supabase → Database → Backups).
--   2. O passo 7 (BOOTSTRAP) é obrigatório — sem ele NINGUÉM é admin e a
--      aba de usuários fica inacessível. Rodar na mesma sessão.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1. Tabela de usuários da aplicação (espelho de auth.users)
-- ─────────────────────────────────────────────────────────────────────
-- Por que espelho: o front usa a anon key e NÃO consegue ler auth.users
-- (isso exige service_role, que nunca pode ir para o navegador). O trigger
-- do passo 3 mantém esta tabela em dia sozinho.

CREATE TABLE IF NOT EXISTS facebook_ads_manager.app_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_role ON facebook_ads_manager.app_users(role);

DROP TRIGGER IF EXISTS app_users_updated_at ON facebook_ads_manager.app_users;
CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON facebook_ads_manager.app_users
  FOR EACH ROW EXECUTE PROCEDURE facebook_ads_manager.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- 2. Funções de permissão
-- ─────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER é obrigatório: sem isso a policy de app_users
-- consultaria app_users e entraria em recursão infinita.

CREATE OR REPLACE FUNCTION facebook_ads_manager.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM facebook_ads_manager.app_users
    WHERE id = auth.uid() AND role = 'admin' AND active
  );
$$;

CREATE OR REPLACE FUNCTION facebook_ads_manager.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM facebook_ads_manager.app_users
    WHERE id = auth.uid() AND active
  );
$$;

GRANT EXECUTE ON FUNCTION facebook_ads_manager.is_admin()       TO authenticated;
GRANT EXECUTE ON FUNCTION facebook_ads_manager.is_active_user() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3. Usuário novo no Auth entra sozinho na tabela
-- ─────────────────────────────────────────────────────────────────────
-- Fluxo de criação: admin cria a pessoa em Authentication → Users → Add user
-- no painel do Supabase; ela aparece na aba Usuários como operador, e o admin
-- ajusta o papel por lá. (A tela de Cadastro do app foi removida.)

CREATE OR REPLACE FUNCTION facebook_ads_manager.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO facebook_ads_manager.app_users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION facebook_ads_manager.handle_new_auth_user();


-- ─────────────────────────────────────────────────────────────────────
-- 4. Trazer para a tabela quem já tem conta
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO facebook_ads_manager.app_users (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 5. RLS da própria app_users
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE facebook_ads_manager.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_select   ON facebook_ads_manager.app_users;
DROP POLICY IF EXISTS app_users_admin_iu ON facebook_ads_manager.app_users;
DROP POLICY IF EXISTS app_users_admin_up ON facebook_ads_manager.app_users;
DROP POLICY IF EXISTS app_users_admin_de ON facebook_ads_manager.app_users;

-- cada um enxerga a própria linha; admin enxerga todas
CREATE POLICY app_users_select ON facebook_ads_manager.app_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR facebook_ads_manager.is_admin());

CREATE POLICY app_users_admin_iu ON facebook_ads_manager.app_users
  FOR INSERT TO authenticated WITH CHECK (facebook_ads_manager.is_admin());

CREATE POLICY app_users_admin_up ON facebook_ads_manager.app_users
  FOR UPDATE TO authenticated
  USING (facebook_ads_manager.is_admin()) WITH CHECK (facebook_ads_manager.is_admin());

CREATE POLICY app_users_admin_de ON facebook_ads_manager.app_users
  FOR DELETE TO authenticated USING (facebook_ads_manager.is_admin());


-- ─────────────────────────────────────────────────────────────────────
-- 6. Trocar a policy permissiva de todas as tabelas
-- ─────────────────────────────────────────────────────────────────────
-- ADMIN: escrita nos cadastros estruturais (BM, contas, páginas, IG, pixel, site)
-- TODOS (ativos): leitura em tudo + escrita no que é operação do dia a dia

DO $$
DECLARE
  t TEXT;
  -- cadastro estrutural: só admin escreve
  admin_write TEXT[] := ARRAY[
    'business_managers', 'ad_accounts', 'ad_pages',
    'instagram_accounts', 'pixels', 'websites'
  ];
  -- operação: qualquer usuário ativo escreve
  user_write TEXT[] := ARRAY[
    'profiles', 'campaigns', 'ad_sets', 'ads',
    'bulk_templates', 'bulk_executions', 'advideos_tasks'
  ];
BEGIN
  FOREACH t IN ARRAY (admin_write || user_write) LOOP
    EXECUTE format('ALTER TABLE facebook_ads_manager.%I ENABLE ROW LEVEL SECURITY', t);
    -- remove a policy antiga que liberava tudo
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON facebook_ads_manager.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON facebook_ads_manager.%I', t || '_read',  t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON facebook_ads_manager.%I', t || '_write', t);

    -- leitura: qualquer usuário ativo
    EXECUTE format($f$
      CREATE POLICY %I ON facebook_ads_manager.%I
        FOR SELECT TO authenticated
        USING (facebook_ads_manager.is_active_user())
    $f$, t || '_read', t);
  END LOOP;

  -- escrita restrita a admin
  FOREACH t IN ARRAY admin_write LOOP
    EXECUTE format($f$
      CREATE POLICY %I ON facebook_ads_manager.%I
        FOR ALL TO authenticated
        USING (facebook_ads_manager.is_admin())
        WITH CHECK (facebook_ads_manager.is_admin())
    $f$, t || '_write', t);
  END LOOP;

  -- escrita liberada para usuário ativo
  FOREACH t IN ARRAY user_write LOOP
    EXECUTE format($f$
      CREATE POLICY %I ON facebook_ads_manager.%I
        FOR ALL TO authenticated
        USING (facebook_ads_manager.is_active_user())
        WITH CHECK (facebook_ads_manager.is_active_user())
    $f$, t || '_write', t);
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- 7. BOOTSTRAP — OBRIGATÓRIO
-- ─────────────────────────────────────────────────────────────────────
-- Sem isto ninguém é admin: a aba Usuários some para todo mundo e nenhum
-- cadastro de BM/conta pode mais ser editado. Trocar o e-mail e rodar.

UPDATE facebook_ads_manager.app_users
SET role = 'admin'
WHERE email = 'anabeatrizpelajo@uvepom.com';   -- <<< conferir/ajustar antes de rodar

-- Conferir que deu certo ANTES de fechar a aba:
SELECT email, role, active FROM facebook_ads_manager.app_users ORDER BY role, email;


-- =====================================================================
-- ROLLBACK (se precisar voltar ao comportamento anterior)
-- =====================================================================
-- DO $$
-- DECLARE t TEXT;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY['business_managers','ad_accounts','ad_pages',
--     'instagram_accounts','pixels','websites','profiles','campaigns','ad_sets',
--     'ads','bulk_templates','bulk_executions','advideos_tasks'] LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON facebook_ads_manager.%I', t||'_read', t);
--     EXECUTE format('DROP POLICY IF EXISTS %I ON facebook_ads_manager.%I', t||'_write', t);
--     EXECUTE format($f$CREATE POLICY "authenticated_all" ON facebook_ads_manager.%I
--       FOR ALL TO authenticated USING (true) WITH CHECK (true)$f$, t);
--   END LOOP;
-- END $$;
