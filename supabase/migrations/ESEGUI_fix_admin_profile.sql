-- =====================================================
-- Fix: crea profilo admin in user_profiles se mancante
-- L'utente admin@beautyx.it esiste in auth.users ma
-- non ha una riga corrispondente in user_profiles.
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- Inserisce il profilo admin usando l'id da auth.users
INSERT INTO user_profiles (
  id,
  email,
  nome,
  cognome,
  ruolo,
  ruolo_livello,
  piano,
  attivo,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', 'Admin'),
  COALESCE(au.raw_user_meta_data->>'cognome', 'BeautyX'),
  'admin',
  'admin',
  'enterprise',
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'admin@beautyx.it'
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
  );

-- Verifica risultato
SELECT id, email, ruolo_livello, attivo
FROM user_profiles
WHERE email = 'admin@beautyx.it';
