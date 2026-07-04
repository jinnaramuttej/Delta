# Founder OS — Agent Context

## Stack
- Next.js 15 App Router, TypeScript, Tailwind
- Supabase (Postgres) — client-side using anon key, no RLS for this hackathon
- Ollama running locally at http://localhost:11434/api/chat, model: qwen3:8b
- Always include "/no_think" at the start of the system prompt in Ollama calls to disable reasoning trace
- Ollama call options: { temperature: 0.2, num_predict: 150-400 depending on task }

## API Contract
Every agent endpoint (/api/agent/[type]) must return exactly:
{
  "agentUsed": "finance" | "hiring" | "legal" | "gtm",
  "draft": string,
  "requiresApproval": boolean,
  "summary": string
}

## Supabase Schema
founder_profile(id uuid pk, name text, startup_name text, industry text, tech_stack text, stage text, created_at timestamp)
agent_actions(id uuid pk, founder_id uuid, agent_type text, input_message text, output_draft jsonb, requires_approval boolean, approved boolean default false, status text default 'pending', created_at timestamp)
finance_snapshots(id uuid pk, founder_id uuid, monthly_burn numeric, cash_in_bank numeric, runway_months numeric, created_at timestamp)

## Style
Tailwind only, no external UI libraries. Dark theme, clean SaaS look.

## Git Workflow
After every response that produces file changes, commit and push to GitHub with a concise, plain-language commit message (no AI jargon, no emoji). Use multiple commits when changes span unrelated concerns — one logical unit per commit.