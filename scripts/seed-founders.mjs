// scripts/seed-founders.mjs
// Run with: node scripts/seed-founders.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cguwyrdixbkzofnlujpw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dNwwx5H3_5qrh4d-7k7_aA_hjQ--JDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const founders = [
  {
    name: 'Arjun Mehta',
    startup_name: 'StackFlow',
    industry: 'SaaS',
    tech_stack: 'MERN',
    stage: 'MVP',
  },
  {
    name: 'Priya Nair',
    startup_name: 'HireLoop',
    industry: 'HR Tech',
    tech_stack: 'MERN',
    stage: 'Pre-seed',
  },
  {
    name: 'Daniel Wu',
    startup_name: 'TraceAI',
    industry: 'AI / ML',
    tech_stack: 'Python, FastAPI, React, PostgreSQL',
    stage: 'Seed',
  },
  {
    name: 'Sofia Reyes',
    startup_name: 'LegalMate',
    industry: 'LegalTech',
    tech_stack: 'Next.js, Supabase, OpenAI',
    stage: 'MVP',
  },
  {
    name: 'Marcus Osei',
    startup_name: 'FinPulse',
    industry: 'FinTech',
    tech_stack: 'Flutter, Firebase, Node.js',
    stage: 'Pre-seed',
  },
  {
    name: 'Ananya Iyer',
    startup_name: 'GrowthDeck',
    industry: 'Marketing SaaS',
    tech_stack: 'Vue.js, Laravel, MySQL',
    stage: 'Seed',
  },
  {
    name: 'Lena Kovacs',
    startup_name: 'ShipFast',
    industry: 'DevTools',
    tech_stack: 'Go, Kubernetes, React',
    stage: 'Series A',
  },
  {
    name: 'Rohan Das',
    startup_name: 'EduSpark',
    industry: 'EdTech',
    tech_stack: 'MERN',
    stage: 'MVP',
  },
  {
    name: 'Claire Fontaine',
    startup_name: 'HealthBridge',
    industry: 'HealthTech',
    tech_stack: 'Django, React, AWS',
    stage: 'Seed',
  },
  {
    name: 'Tomás Vargas',
    startup_name: 'LogiTrack',
    industry: 'Logistics',
    tech_stack: 'Spring Boot, Angular, PostgreSQL',
    stage: 'Pre-seed',
  },
];

async function seed() {
  console.log('Seeding founder_profile table...\n');

  const { data, error } = await supabase
    .from('founder_profile')
    .insert(founders)
    .select('id, name, startup_name, tech_stack, stage');

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log('Inserted founders:\n');
  data.forEach((f) => {
    console.log(`  ${f.id}  |  ${f.name}  |  ${f.startup_name}  |  ${f.tech_stack}  |  ${f.stage}`);
  });

  console.log('\nDone. Copy any ID above for testing.');
}

seed();
