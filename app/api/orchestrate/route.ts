import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';

const CLASSIFIER_SYSTEM_PROMPT =
  'You are a routing classifier for a startup founder assistant. ' +
  'Classify the founder\'s message into exactly one of: finance, hiring, legal, gtm. ' +
  'Choose "gtm" for marketing posts, launch announcements, social media, landing page copy, or positioning statements. ' +
  'Also extract any relevant details (tech stack, role, amount, topic) as a short string. ' +
  'Return ONLY valid JSON in this exact shape: {"agent": "finance|hiring|legal|gtm", "extractedContext": "short string"}. ' +
  'No explanation, no markdown, no extra text. ' +
  'Even for greetings or unclear messages, you MUST pick the closest matching agent — never return an empty string for agent. Default to \'legal\' if truly unclear.';

type ClassifierResult = {
  agent: 'finance' | 'hiring' | 'legal' | 'gtm';
  extractedContext: string;
};

function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // Extract the first complete {...} JSON object, discarding any trailing text/punctuation
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : stripped;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { founderId, message } = body as { founderId: string; message: string };

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    // ── Step 1: Classify the message ──────────────────────────────────────────
    console.log('[orchestrate] Classifying message:', message);

    const rawClassification = await callOllama(CLASSIFIER_SYSTEM_PROMPT, message, 800);
    console.log('[orchestrate] Raw Ollama classifier output:', JSON.stringify(rawClassification));

    let classification: ClassifierResult;
    try {
      const cleaned = stripMarkdownFences(rawClassification);
      console.log('[orchestrate] Cleaned classifier output for parse:', JSON.stringify(cleaned));
      classification = JSON.parse(cleaned) as ClassifierResult;
    } catch {
      console.warn('[orchestrate] JSON parse failed, defaulting to legal. Raw:', rawClassification);
      classification = { agent: 'legal', extractedContext: message };
    }

    // Fallback: If agent is empty, undefined, or invalid, default to 'legal'
    const validAgents = ['finance', 'hiring', 'legal', 'gtm'];
    if (!classification.agent || !validAgents.includes(classification.agent)) {
      console.warn(`[orchestrate] Invalid classification agent "${classification.agent}", defaulting to "legal"`);
      classification.agent = 'legal';
    }

    console.log('[orchestrate] Classification result:', classification);

    // ── Step 2: Fetch founder profile from Supabase ───────────────────────────
    console.log('[orchestrate] Fetching founder profile for id:', founderId);

    const { data: founderProfile, error: dbError } = await supabase
      .from('founder_profile')
      .select('*')
      .eq('id', founderId)
      .single();

    if (dbError) {
      console.warn('[orchestrate] Supabase error (non-fatal):', dbError.message);
    }

    console.log('[orchestrate] Founder profile:', founderProfile ?? 'not found');

    // ── Step 3: Forward to the appropriate agent endpoint ─────────────────────
    const { agent, extractedContext } = classification;

    const agentUrl = `http://127.0.0.1:3000/api/agent/${agent}`;
    console.log('[orchestrate] Calling agent:', agentUrl);

    const agentRes = await fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId, message, extractedContext, founderProfile }),
    });

    if (!agentRes.ok) {
      const text = await agentRes.text();
      throw new Error(`Agent endpoint ${agent} returned ${agentRes.status}: ${text}`);
    }

    const agentData = await agentRes.json();

    console.log('[orchestrate] Final response from agent:', agentData);

    return NextResponse.json(agentData);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[orchestrate] Unhandled error:', message);
    return NextResponse.json({ error: `Orchestrator failed: ${message}` }, { status: 500 });
  }
}
