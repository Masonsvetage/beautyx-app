-- Migration: allinea nome piano 'report_profiling' al rename testuale del
-- 08/09/2026 ("report"/"report di profiling" -> "identikit strategico") e al
-- rename del metodo CARE -> CURA fatto settimane prima (vedi commit "content:
-- rinomina metodo CARE->CURA su /report e /newsletter + materiali collegati",
-- 3 settembre 2026).
--
-- Il valore di subscription_plans.nome per codice='report_profiling' era
-- rimasto quello del seed originale in 20260828_profiling_report_care.sql
-- ("Report di profiling CARE"), mai piu' toccato da allora (INSERT con
-- ON CONFLICT DO NOTHING, quindi immune ai rename successivi fatti sui
-- contenuti). E' la fonte del badge/voce "Report di profiling CARE" mostrato
-- nella navbar (components/Navbar.js, badge piano abbonamento, link
-- /impostazioni/abbonamento, title "Gestisci il tuo abbonamento").
--
-- NOTA: questa migration e' stata gia' applicata in produzione via Supabase
-- MCP (project scfumedmisbuxhdywwpb) l'08/09/2026 col nome
-- "rename_report_profiling_plan_nome_identikit_cura". Questo file la registra
-- nel repo per allineare lo storico migrations; e' idempotente (WHERE nome =
-- valore vecchio) quindi rieseguirla non ha effetto se gia' applicata.

UPDATE subscription_plans
SET nome = 'Identikit strategico CURA'
WHERE codice = 'report_profiling'
  AND nome = 'Report di profiling CARE';
