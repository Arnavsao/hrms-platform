-- Voice interview enhancements for screenings table
-- Adds richer scoring columns, metadata, and indexing needed for live voice sessions

ALTER TABLE screenings
    ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS communication_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS domain_knowledge_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS audio_url TEXT,
    ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS transcript_tokens JSONB;

-- Ensure transcript and AI summary have safe defaults for easier querying
ALTER TABLE screenings
    ALTER COLUMN transcript SET DEFAULT '',
    ALTER COLUMN ai_summary SET DEFAULT '{}'::jsonb;

-- Index to quickly locate voice interviews
CREATE INDEX IF NOT EXISTS idx_screenings_mode ON screenings(mode);
