CREATE TABLE inbox_sources (
    id uuid PRIMARY KEY,
    bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    legacy_document_id uuid UNIQUE REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    withdrawn boolean NOT NULL DEFAULT false,
    active_version integer NOT NULL DEFAULT 0
);
-- next statement
CREATE INDEX inbox_sources_bot ON inbox_sources(bot_id);
-- next statement
CREATE TABLE inbox_source_versions (
    source_id uuid NOT NULL REFERENCES inbox_sources(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    filename text NOT NULL,
    raw_hash text NOT NULL,
    text_hash text NOT NULL,
    raw_bytes bytea,
    normalized_bytes bytea,
    retry_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    PRIMARY KEY(source_id, version)
);
-- next statement
CREATE INDEX inbox_publish_pending ON inbox_source_versions(retry_at) WHERE raw_bytes IS NOT NULL;
-- next statement
CREATE TABLE inbox_source_sections (
    id uuid PRIMARY KEY,
    source_id uuid NOT NULL,
    version integer NOT NULL,
    location text NOT NULL,
    byte_start integer NOT NULL,
    byte_length integer NOT NULL,
    content text NOT NULL,
    sha256 text NOT NULL,
    FOREIGN KEY(source_id, version) REFERENCES inbox_source_versions(source_id, version) ON DELETE CASCADE
);
-- next statement
CREATE INDEX inbox_source_sections_version ON inbox_source_sections(source_id, version);
-- next statement
CREATE VIEW inbox_published_sections AS
    SELECT p.*, s.bot_id, v.filename, v.text_hash
    FROM inbox_source_sections p
    JOIN inbox_sources s ON s.id=p.source_id AND s.active_version=p.version AND NOT s.withdrawn
    JOIN inbox_source_versions v USING(source_id,version)
    LEFT JOIN knowledge_documents d ON d.id=s.legacy_document_id
    WHERE v.published_at IS NOT NULL AND (s.legacy_document_id IS NULL OR (d.bot_id=s.bot_id AND d.deleted_at IS NULL));
-- next statement
CREATE TABLE inbox_flow_releases (
    id uuid PRIMARY KEY,
    bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    template_id uuid NOT NULL,
    version integer NOT NULL CHECK(version>0),
    name text NOT NULL,
    digest text NOT NULL,
    graph jsonb NOT NULL,
    flex jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(bot_id,template_id,version)
);
