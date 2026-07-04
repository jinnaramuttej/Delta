-- Disable RLS on all three tables for this hackathon
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE founder_profile    DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance_snapshots  DISABLE ROW LEVEL SECURITY;
