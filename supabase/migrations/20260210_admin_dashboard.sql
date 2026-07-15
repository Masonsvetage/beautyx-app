-- ============================================================================
-- Migration: 20260210_admin_dashboard.sql
-- Description: PostgreSQL functions for BeautyX Admin Dashboard
-- ============================================================================

-- ============================================================================
-- 1. get_admin_dashboard_stats()
--    Returns a single row with aggregate platform statistics.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE(
    total_users       BIGINT,
    active_users      BIGINT,
    blocked_users     BIGINT,
    users_by_role     JSONB,
    total_centri      BIGINT,
    active_subscriptions BIGINT,
    total_mrr         BIGINT,
    active_users_24h  BIGINT,
    active_users_7d   BIGINT,
    active_users_30d  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_counts AS (
        SELECT
            count(*)                              AS total_users,
            count(*) FILTER (WHERE attivo = true)  AS active_users,
            count(*) FILTER (WHERE attivo = false) AS blocked_users
        FROM user_profiles
    ),
    role_counts AS (
        SELECT
            coalesce(
                jsonb_object_agg(ruolo_livello, cnt),
                '{}'::jsonb
            ) AS users_by_role
        FROM (
            SELECT ruolo_livello, count(*) AS cnt
            FROM user_profiles
            GROUP BY ruolo_livello
        ) r
    ),
    centri_count AS (
        SELECT count(*) AS total_centri
        FROM beauty_centers
    ),
    subscription_stats AS (
        SELECT
            count(*)                      AS active_subscriptions,
            coalesce(sum(sp.prezzo_cents), 0) AS total_mrr
        FROM client_subscriptions cs
        JOIN subscription_packages sp ON sp.id = cs.package_id
        WHERE cs.stato = 'attivo'
    ),
    activity_stats AS (
        SELECT
            count(DISTINCT user_id) FILTER (
                WHERE created_at >= now() - interval '24 hours'
            ) AS active_users_24h,
            count(DISTINCT user_id) FILTER (
                WHERE created_at >= now() - interval '7 days'
            ) AS active_users_7d,
            count(DISTINCT user_id) FILTER (
                WHERE created_at >= now() - interval '30 days'
            ) AS active_users_30d
        FROM user_activity_log
    )
    SELECT
        uc.total_users,
        uc.active_users,
        uc.blocked_users,
        rc.users_by_role,
        cc.total_centri,
        ss.active_subscriptions,
        ss.total_mrr,
        a.active_users_24h,
        a.active_users_7d,
        a.active_users_30d
    FROM user_counts uc
    CROSS JOIN role_counts rc
    CROSS JOIN centri_count cc
    CROSS JOIN subscription_stats ss
    CROSS JOIN activity_stats a;
END;
$$;

-- ============================================================================
-- 2. get_system_health_summary()
--    Returns a single row highlighting potential issues requiring attention.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS TABLE(
    users_without_centro    BIGINT,
    expired_subscriptions   BIGINT,
    pending_contact_requests BIGINT,
    unassigned_centri       BIGINT,
    users_never_logged_in   BIGINT,
    users_inactive_30d      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH without_centro AS (
        SELECT count(*) AS cnt
        FROM user_profiles
        WHERE attivo = true
          AND centro_id IS NULL
          AND ruolo_livello IN ('hpa', 'operatore', 'centro_admin')
    ),
    expired_subs AS (
        SELECT count(*) AS cnt
        FROM client_subscriptions
        WHERE stato = 'scaduto'
           OR (data_scadenza < now() AND stato != 'annullato')
    ),
    pending_contacts AS (
        SELECT count(*) AS cnt
        FROM contact_requests
        WHERE stato = 'pending'
    ),
    unassigned AS (
        SELECT count(*) AS cnt
        FROM beauty_centers bc
        WHERE NOT EXISTS (
            SELECT 1
            FROM hpa_centro_assignments hca
            WHERE hca.centro_id = bc.id
              AND hca.data_inizio <= now()
              AND (hca.data_fine IS NULL OR hca.data_fine >= now())
        )
    ),
    never_logged AS (
        SELECT count(*) AS cnt
        FROM user_profiles
        WHERE attivo = true
          AND last_login_at IS NULL
    ),
    inactive_30 AS (
        SELECT count(*) AS cnt
        FROM user_profiles
        WHERE attivo = true
          AND (
              last_activity_at IS NULL
              OR last_activity_at < now() - interval '30 days'
          )
    )
    SELECT
        wc.cnt,
        es.cnt,
        pc.cnt,
        ua.cnt,
        nl.cnt,
        i30.cnt
    FROM without_centro wc
    CROSS JOIN expired_subs es
    CROSS JOIN pending_contacts pc
    CROSS JOIN unassigned ua
    CROSS JOIN never_logged nl
    CROSS JOIN inactive_30 i30;
END;
$$;

-- ============================================================================
-- 3. get_registration_trend(p_days)
--    Returns daily registration counts for the last p_days days.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_registration_trend(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    registration_date DATE,
    user_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.dt::date                        AS registration_date,
        count(up.id)                      AS user_count
    FROM generate_series(
        (now() - make_interval(days => p_days))::date,
        now()::date,
        '1 day'::interval
    ) AS d(dt)
    LEFT JOIN user_profiles up
        ON up.created_at::date = d.dt::date
    GROUP BY d.dt::date
    ORDER BY d.dt::date;
END;
$$;

-- ============================================================================
-- 4. get_admin_hpa_performance()
--    Returns per-HPA performance metrics for the current month.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_hpa_performance()
RETURNS TABLE(
    hpa_id                      UUID,
    hpa_nome                    TEXT,
    hpa_email                   TEXT,
    centri_gestiti              BIGINT,
    appuntamenti_mese           BIGINT,
    appuntamenti_completati_mese BIGINT,
    messaggi_mese               BIGINT,
    richieste_pending           BIGINT,
    ultimo_accesso              TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_month_start DATE;
BEGIN
    v_month_start := date_trunc('month', now())::date;

    RETURN QUERY
    SELECT
        up.id                                AS hpa_id,
        concat(up.nome, ' ', up.cognome)::text AS hpa_nome,
        up.email::text                       AS hpa_email,

        -- Active centro assignments
        (
            SELECT count(*)
            FROM hpa_centro_assignments hca
            WHERE hca.hpa_id = up.id
              AND hca.data_inizio <= now()
              AND (hca.data_fine IS NULL OR hca.data_fine >= now())
        )                                    AS centri_gestiti,

        -- All appointments this month
        (
            SELECT count(*)
            FROM hpa_appointments ha
            WHERE ha.hpa_id = up.id
              AND ha.created_at >= v_month_start
        )                                    AS appuntamenti_mese,

        -- Completed appointments this month
        (
            SELECT count(*)
            FROM hpa_appointments ha
            WHERE ha.hpa_id = up.id
              AND ha.created_at >= v_month_start
              AND ha.stato = 'completato'
        )                                    AS appuntamenti_completati_mese,

        -- Messages sent by HPA this month
        (
            SELECT count(*)
            FROM hpa_client_messages hcm
            WHERE hcm.hpa_id = up.id
              AND hcm.sender_type = 'hpa'
              AND hcm.created_at >= v_month_start
        )                                    AS messaggi_mese,

        -- Pending contact requests assigned to this HPA
        (
            SELECT count(*)
            FROM contact_requests cr
            WHERE cr.assegnato_a = up.id
              AND cr.stato = 'pending'
        )                                    AS richieste_pending,

        up.last_login_at                     AS ultimo_accesso

    FROM user_profiles up
    WHERE up.ruolo_livello = 'hpa'
      AND up.attivo = true
    ORDER BY centri_gestiti DESC, appuntamenti_mese DESC;
END;
$$;

-- ============================================================================
-- 5. get_user_activity_levels()
--    Categorises active users by their last activity timestamp.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_activity_levels()
RETURNS TABLE(
    activity_level TEXT,
    user_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH classified AS (
        SELECT
            CASE
                WHEN last_activity_at IS NULL AND last_login_at IS NULL
                    THEN 'mai_collegato'
                WHEN last_activity_at >= now() - interval '24 hours'
                    THEN 'molto_attivo'
                WHEN last_activity_at >= now() - interval '7 days'
                    THEN 'attivo'
                WHEN last_activity_at >= now() - interval '30 days'
                    THEN 'basso'
                ELSE 'inattivo'
            END AS lvl
        FROM user_profiles
        WHERE attivo = true
    )
    SELECT
        c.lvl::text  AS activity_level,
        count(*)     AS user_count
    FROM classified c
    GROUP BY c.lvl
    ORDER BY
        CASE c.lvl
            WHEN 'molto_attivo'  THEN 1
            WHEN 'attivo'        THEN 2
            WHEN 'basso'         THEN 3
            WHEN 'inattivo'      THEN 4
            WHEN 'mai_collegato' THEN 5
        END;
END;
$$;

-- ============================================================================
-- 6. get_centro_health_scores()
--    Returns a health score (0-100) for every centro based on four criteria:
--      +25 pts  active subscription
--      +25 pts  assigned HPA
--      +25 pts  recent user activity (last 30 days)
--      +25 pts  active objectives (stato = 'in_corso')
-- ============================================================================
CREATE OR REPLACE FUNCTION get_centro_health_scores()
RETURNS TABLE(
    centro_id           UUID,
    centro_nome         TEXT,
    has_subscription     BOOLEAN,
    subscription_status  TEXT,
    has_hpa             BOOLEAN,
    hpa_nome            TEXT,
    obiettivi_attivi    BIGINT,
    health_score        INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id                              AS centro_id,
        bc.nome::text                      AS centro_nome,

        -- Subscription check
        EXISTS (
            SELECT 1
            FROM client_subscriptions cs
            WHERE cs.centro_id = bc.id
              AND cs.stato = 'attivo'
        )                                  AS has_subscription,

        (
            SELECT cs.stato::text
            FROM client_subscriptions cs
            WHERE cs.centro_id = bc.id
            ORDER BY cs.data_inizio DESC
            LIMIT 1
        )                                  AS subscription_status,

        -- HPA assignment check
        EXISTS (
            SELECT 1
            FROM hpa_centro_assignments hca
            WHERE hca.centro_id = bc.id
              AND hca.data_inizio <= now()
              AND (hca.data_fine IS NULL OR hca.data_fine >= now())
        )                                  AS has_hpa,

        (
            SELECT concat(up.nome, ' ', up.cognome)::text
            FROM hpa_centro_assignments hca
            JOIN user_profiles up ON up.id = hca.hpa_id
            WHERE hca.centro_id = bc.id
              AND hca.data_inizio <= now()
              AND (hca.data_fine IS NULL OR hca.data_fine >= now())
            ORDER BY hca.data_inizio DESC
            LIMIT 1
        )                                  AS hpa_nome,

        -- Active objectives count
        (
            SELECT count(*)
            FROM obiettivi o
            WHERE o.centro_id = bc.id
              AND o.stato = 'in_corso'
        )                                  AS obiettivi_attivi,

        -- Health score computation (0-100)
        (
            -- +25 for active subscription
            CASE WHEN EXISTS (
                SELECT 1
                FROM client_subscriptions cs
                WHERE cs.centro_id = bc.id
                  AND cs.stato = 'attivo'
            ) THEN 25 ELSE 0 END

            -- +25 for active HPA assignment
            + CASE WHEN EXISTS (
                SELECT 1
                FROM hpa_centro_assignments hca
                WHERE hca.centro_id = bc.id
                  AND hca.data_inizio <= now()
                  AND (hca.data_fine IS NULL OR hca.data_fine >= now())
            ) THEN 25 ELSE 0 END

            -- +25 for recent activity (any user activity in last 30 days)
            + CASE WHEN EXISTS (
                SELECT 1
                FROM user_activity_log ual
                WHERE ual.centro_id = bc.id
                  AND ual.created_at >= now() - interval '30 days'
            ) THEN 25 ELSE 0 END

            -- +25 for at least one active objective
            + CASE WHEN EXISTS (
                SELECT 1
                FROM obiettivi o
                WHERE o.centro_id = bc.id
                  AND o.stato = 'in_corso'
            ) THEN 25 ELSE 0 END
        )::integer                         AS health_score

    FROM beauty_centers bc
    ORDER BY health_score DESC, bc.nome;
END;
$$;

-- ============================================================================
-- Grant execute permissions to authenticated users (Supabase convention).
-- The SECURITY DEFINER attribute ensures the functions run with the
-- privileges of the owner, so no RLS policies are needed on the functions.
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats()          TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_summary()          TO authenticated;
GRANT EXECUTE ON FUNCTION get_registration_trend(INTEGER)      TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_hpa_performance()          TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_levels()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_centro_health_scores()           TO authenticated;
