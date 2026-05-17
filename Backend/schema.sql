-- ╔══════════════════════════════════════════════════════════════════╗
-- ║             MOURCHID-AI — Supabase Schema                      ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Run this once in your Supabase SQL Editor before starting the bot.

CREATE TABLE IF NOT EXISTS reports (
    report_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id    VARCHAR(32)   NOT NULL,
    crop_type           VARCHAR(128),
    detected_disease    VARCHAR(256),
    prescribed_chemical TEXT,
    farmer_feedback     TEXT,
    status              VARCHAR(20)   NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN','CLOSED_SUCCESS','CLOSED_FAILED')),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for the common query pattern: latest OPEN report per chat
CREATE INDEX IF NOT EXISTS idx_reports_chat_status
    ON reports (telegram_chat_id, status, created_at DESC);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON reports;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
