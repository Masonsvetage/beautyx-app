-- =====================================================
-- FIX URGENTE: infinite recursion (42P17) su user_profiles in produzione
-- (scfumedmisbuxhdywwpb)
-- Applicato DIRETTAMENTE in produzione il 07/09/2026 (Davide, via
-- apply_migration MCP, nome "fix_user_profiles_rls_recursion"), a caldo,
-- pochi minuti dopo 20260907_fix_user_profiles_schema_drift.sql.
-- Questo file e' il record nel repo di quanto gia' eseguito live.
-- =====================================================
--
-- SINTOMO IN PRODUZIONE (console browser, beautyx.it, test live):
--   Errore caricamento profilo: {code: 42P17, details: null, hint: null,
--   message: infinite recursion detected in policy for relation "user_profiles"}
-- Bloccava il caricamento del profilo per QUALSIASI utente, incluso il
-- proprietario dei propri dati (non solo il ramo "admin").
--
-- CAUSA REALE (identificata leggendo pg_policies in produzione):
-- le due policy create dalla migration precedente (20260907_fix_
-- user_profiles_schema_drift.sql, righe 99-109) valutano, dentro il proprio
-- USING, una sotto-query SELECT sulla STESSA tabella user_profiles:
--
--   "Admin can view all profiles" (SELECT):
--     EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
--             AND (ruolo = 'admin' OR ruolo_livello = 'admin'))
--   "Admin can update all profiles" (UPDATE): stessa sotto-query.
--
-- Per decidere se una riga di user_profiles e' leggibile, Postgres deve
-- rivalutare le policy su user_profiles per la sotto-query -> di nuovo la
-- stessa policy -> ricorsione infinita. Questo scatta per QUALUNQUE SELECT
-- su user_profiles (anche "auth.uid() = id"), perche' il planner valuta
-- comunque tutte le policy PERMISSIVE della tabella per il comando.
--
-- FIX: spostare la verifica "sono admin?" in una funzione SECURITY DEFINER
-- di proprieta' di "postgres" (che su questo progetto ha rolbypassrls =
-- true sulla tabella). Una funzione SECURITY DEFINER gira con i privilegi
-- del proprietario: la query interna a user_profiles bypassa RLS e quindi
-- non ri-valuta le policy che la chiamano -> niente ricorsione.
--
-- Verificato live dopo l'applicazione (via SET LOCAL ROLE authenticated +
-- request.jwt.claim.sub, per simulare RLS reale non service-role):
--   - SELECT su user_profiles con auth.uid() impostato: 1 riga (la propria),
--     nessun errore 42P17.
--   - SELECT public.is_admin(auth.uid()) come ruolo authenticated: esegue
--     correttamente (false, nessun utente admin presente al momento del fix).
--   - pg_policies non mostra piu' alcun riferimento diretto a user_profiles
--     dentro le policy stesse (solo la chiamata a is_admin(auth.uid())).

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = uid
      AND (ruolo::text = 'admin' OR ruolo_livello::text = 'admin')
  );
$$;

-- Solo gli utenti autenticati possono invocare la funzione (necessario:
-- le policy sotto la chiamano per conto del ruolo "authenticated"). anon e
-- PUBLIC vengono esclusi esplicitamente: su questo progetto Supabase
-- concede EXECUTE di default via ALTER DEFAULT PRIVILEGES anche ad anon,
-- quindi va revocato a mano.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.user_profiles;
CREATE POLICY "Admin can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.user_profiles;
CREATE POLICY "Admin can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- NOTA: le policy "Users can view/update/insert own profile" (auth.uid() =
-- id) non sono state toccate: non erano la causa della ricorsione, ma
-- venivano comunque bloccate perche' Postgres valuta tutte le policy
-- PERMISSIVE della tabella per il comando, e una di esse (quella admin)
-- andava in loop prima ancora di arrivare a decidere l'OR finale.
