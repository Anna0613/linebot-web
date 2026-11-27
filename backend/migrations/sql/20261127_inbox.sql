CREATE TABLE inbox_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    source_type text NOT NULL CHECK (source_type IN ('user', 'group', 'room')),
    source_id text NOT NULL,
    owner_mode text NOT NULL DEFAULT 'auto' CHECK (owner_mode IN ('auto','human')),
    ownership_epoch integer NOT NULL DEFAULT 0,
    last_seq bigint NOT NULL DEFAULT 0,
    last_activity timestamptz NOT NULL,
    UNIQUE (bot_id, source_type, source_id)
);
CREATE INDEX inbox_activity ON inbox_conversations (bot_id, last_activity DESC, id DESC);
CREATE TABLE inbox_events (
    bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    event_id text NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL,
    PRIMARY KEY (bot_id, event_id)
);
CREATE TABLE inbox_messages (
    conversation_id uuid NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
    seq bigint NOT NULL,
    line_message_id text NOT NULL,
    actor_id text,
    kind text NOT NULL,
    body text,
    withdrawn boolean NOT NULL DEFAULT false,
    occurred_at timestamptz NOT NULL,
    PRIMARY KEY (conversation_id, seq),
    UNIQUE (conversation_id, line_message_id)
);
CREATE INDEX inbox_message_activity ON inbox_messages (conversation_id, occurred_at DESC, seq DESC);
CREATE TABLE inbox_jobs (
    conversation_id uuid NOT NULL,
    seq bigint NOT NULL,
    ownership_epoch integer NOT NULL,
    state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','cancelled')),
    PRIMARY KEY (conversation_id, seq),
    FOREIGN KEY (conversation_id, seq) REFERENCES inbox_messages(conversation_id, seq) ON DELETE CASCADE
);
