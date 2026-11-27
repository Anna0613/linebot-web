CREATE TABLE user_feedback (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id uuid NOT NULL, category text NOT NULL, message text NOT NULL,
        contact_name text, contact_email text, created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, id));
