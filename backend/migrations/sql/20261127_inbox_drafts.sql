ALTER TABLE inbox_jobs
    ADD COLUMN draft_state text CHECK (draft_state IN ('requested','working','ready','handoff','failed')),
    ADD COLUMN draft_lease uuid,
    ADD COLUMN draft_started_at timestamptz,
    ADD COLUMN draft_body text,
    ADD COLUMN draft_chunk uuid,
    ADD COLUMN draft_hash text,
    ADD COLUMN draft_tools jsonb NOT NULL DEFAULT '[]',
    ADD COLUMN draft_model text;
-- next statement
CREATE INDEX inbox_draft_queue ON inbox_jobs (draft_started_at)
    WHERE state='pending' AND draft_state IN ('requested','working');
-- next statement
CREATE FUNCTION clear_cancelled_inbox_draft() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.state='cancelled' THEN
        NEW.draft_state := NULL;
        NEW.draft_lease := NULL;
        NEW.draft_body := NULL;
        NEW.draft_chunk := NULL;
        NEW.draft_hash := NULL;
        NEW.draft_tools := '[]';
    END IF;
    RETURN NEW;
END;
$$;
-- next statement
CREATE TRIGGER clear_inbox_draft BEFORE UPDATE OF state ON inbox_jobs
    FOR EACH ROW EXECUTE FUNCTION clear_cancelled_inbox_draft();
