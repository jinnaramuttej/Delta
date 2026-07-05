-- Founder OS — Supabase Schema
-- No RLS for this hackathon

CREATE TABLE IF NOT EXISTS founder_profile (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  startup_name   text        NOT NULL,
  industry       text,
  tech_stack     text,
  stage          text,
  created_at     timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id       uuid        REFERENCES founder_profile(id),
  agent_type       text        NOT NULL,
  input_message    text        NOT NULL,
  output_draft     jsonb,
  requires_approval boolean    NOT NULL DEFAULT false,
  approved         boolean     NOT NULL DEFAULT false,
  status           text        NOT NULL DEFAULT 'pending',
  created_at       timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id      uuid        REFERENCES founder_profile(id),
  monthly_burn    numeric     NOT NULL,
  cash_in_bank    numeric     NOT NULL,
  runway_months   numeric     NOT NULL,
  created_at      timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id  uuid        REFERENCES founder_profile(id),
  title       text        NOT NULL,
  event_date  date        NOT NULL,
  event_type  text        NOT NULL DEFAULT 'manual',
  created_at  timestamp   NOT NULL DEFAULT now()
);
