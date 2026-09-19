-- =====================================================
-- FIX SICUREZZA: RLS disabilitata su beautyx_conversations /
-- beautyx_messages / beautyx_insights (progetto scfumedmisbuxhdywwpb)
-- =====================================================
--
-- CONTESTO (19/09/2026): le tabelle sono state create in produzione oggi
-- applicando due migration preesistenti rimaste "orfane"
-- (20260110_beautyx_conversations.sql + 20260126_conversation_pin_delete.sql),
-- ma sono rimaste senza RLS. L'advisor Supabase (get_advisors, lint
-- "rls_disabled_in_public", livello ERROR) lo conferma tuttora:
--   Table "public.beautyx_conversations" is public, but RLS has not been enabled.
--   Table "public.beautyx_messages" is public, but RLS has not been enabled.
--   Table "public.beautyx_insights" is public, but RLS has not been enabled.
-- Riccardo ha eseguito e ripulito una PoC con la sola anon key pubblica che
-- ha confermato la lettura diretta via REST di qualunque riga, inclusa
-- almeno una conversazione reale già esistente (memory/riccardo.md, voce
-- "2026-09-19 (2° giro)"). Le route applicative che usano queste tabelle
-- (conversations/route.js, insights/route.js, chat/route.js) usano
-- SUPABASE_SERVICE_KEY (bypassa comunque RLS) e verificano già l'ownership
-- a monte con verifyCentroOwnership/verifyRowCentroOwnership — quindi
-- abilitare RLS qui non cambia il comportamento dell'app, chiude solo
-- l'accesso DIRETTO non autenticato all'endpoint REST auto-generato.
--
-- PATTERN POLICY: non inventato qui — è lo stesso, verbatim, già in
-- produzione su profiling_sessions / profiling_scenario_responses /
-- profiling_reports (verificato via `pg_policies` prima di scrivere questo
-- file): policy SELECT-only, subquery diretta su user_profiles via
-- auth.uid(), nessuna funzione helper aggiuntiva. Per beautyx_messages
-- (che non ha centro_id proprio, solo conversation_id) si usa lo stesso
-- schema di join già in uso per profiling_scenario_responses->profiling_sessions.
-- Nessuna policy INSERT/UPDATE/DELETE: le scritture reali passano tutte
-- dalle route service-key con ownership già verificata; senza policy di
-- scrittura, un accesso diretto anon/authenticated resta in sola lettura
-- delle proprie righe e deny-by-default per le mutazioni dirette.
--
-- NESSUN RISCHIO DI RICORSIONE (vedi 20260907b_fix_rls_recursion.sql per
-- il bug storico): quel bug nasceva da una policy su user_profiles che
-- interrogava di nuovo user_profiges dentro il proprio USING. Qui invece
-- le policy sono su TABELLE DIVERSE (beautyx_conversations/_messages/
-- _insights) che leggono user_profiles (o beautyx_conversations, per i
-- messaggi) in subquery: nessun ciclo, stesso schema già verificato sicuro
-- su profiling_*. Non serve una funzione SECURITY DEFINER aggiuntiva.
--
-- STATO: file preparato e verificato (SQL riletto, pattern confrontato con
-- pg_policies reali) ma NON ANCORA APPLICATO in produzione da questo agente.
-- Il tool MCP Supabase stesso, nell'advisory di questo lint, istruisce
-- esplicitamente di non auto-applicare il fix RLS e di presentarlo
-- all'utente per decisione ("Do not auto-apply the remediation SQL...
-- Present the SQL to the user and let them decide"). Da applicare via
-- apply_migration solo dopo conferma esplicita di Mason in chat.

ALTER TABLE public.beautyx_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beautyx_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beautyx_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centro vede le proprie conversazioni beautyx"
ON public.beautyx_conversations
FOR SELECT
USING (
  centro_id IN (
    SELECT user_profiles.centro_id FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
  )
);

CREATE POLICY "Centro vede i propri messaggi beautyx"
ON public.beautyx_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.beautyx_conversations
    WHERE centro_id IN (
      SELECT user_profiles.centro_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  )
);

CREATE POLICY "Centro vede i propri insights beautyx"
ON public.beautyx_insights
FOR SELECT
USING (
  centro_id IN (
    SELECT user_profiles.centro_id FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
  )
);

-- NOTA su ruolo admin/HPA: le policy sopra, a differenza di
-- verifyCentroOwnership.js (lib/auth/verifyCentroOwnership.js), NON
-- includono un bypass per ruolo admin né la verifica hpa_centro_assignments.
-- Motivo: (1) mirror esatto del pattern già in uso su profiling_* (che ha
-- la stessa scelta, verificato in pg_policies), per coerenza; (2)
-- hpa_centro_assignments NON esiste ancora come tabella in produzione su
-- questo progetto (verificato: information_schema.tables non la trova) —
-- includerla avrebbe fatto fallire la migration. Se in futuro la tabella
-- HPA viene creata, queste policy andranno riviste per aggiungere lo stesso
-- ramo HPA. L'accesso amministrativo/HPA reale passa comunque dalle route
-- service-key (non da queste policy), quindi non è un gap funzionale oggi.
