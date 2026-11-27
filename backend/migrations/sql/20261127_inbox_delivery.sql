ALTER TABLE inbox_messages
    ADD COLUMN delivery_state text CHECK (delivery_state IN ('queued','accepted','simulated','failed','unknown')),
    ADD COLUMN client_key uuid,
    ADD COLUMN dispatch_key uuid,
    ADD COLUMN dispatch_after timestamptz,
    ADD CONSTRAINT inbox_reply_keys CHECK (
        (delivery_state IS NULL AND client_key IS NULL AND dispatch_key IS NULL) OR
        (delivery_state IS NOT NULL AND client_key IS NOT NULL AND dispatch_key IS NOT NULL)),
    ADD UNIQUE(conversation_id, client_key),
    ADD UNIQUE(dispatch_key);
-- next statement
CREATE INDEX inbox_delivery_pending ON inbox_messages(dispatch_after) WHERE delivery_state='queued';
-- next statement
CREATE TABLE inbox_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    client_key uuid NOT NULL,
    actor_id uuid NOT NULL,
    body text NOT NULL,
    recipients text[],
    delivery_state text NOT NULL DEFAULT 'queued'
        CHECK (delivery_state IN ('queued','accepted','simulated','failed','unknown')),
    created_at timestamptz NOT NULL DEFAULT now(),
    dispatch_after timestamptz NOT NULL DEFAULT now(),
    UNIQUE(bot_id, client_key)
);
-- next statement
ALTER TABLE inbox_messages ADD COLUMN campaign_id uuid REFERENCES inbox_campaigns(id) ON DELETE CASCADE;
-- next statement
CREATE INDEX inbox_campaign_pending ON inbox_campaigns(dispatch_after) WHERE delivery_state='queued';
-- next statement
CREATE INDEX inbox_campaign_messages ON inbox_messages(campaign_id) WHERE campaign_id IS NOT NULL;
