import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/types';

type HiringRequestBody = {
  founderId: string;
  message: string;
  extractedContext: string;
  founderProfile: {
    tech_stack?: string;
    industry?: string;
    stage?: string;
    startup_name?: string;
  } | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HiringRequestBody;
    const { founderId, message, extractedContext, founderProfile } = body;

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    // ── Step 1: Build system prompt with founder profile values ───────────────
    const techStack = founderProfile?.tech_stack ?? 'not specified';
    const industry  = founderProfile?.industry   ?? 'not specified';
    const stage     = founderProfile?.stage      ?? 'not specified';

    const systemPrompt =
      `You are a hiring specialist AI for early-stage startup founders. ` +
      `The founder's tech stack is ${techStack}, industry is ${industry}, stage is ${stage}. ` +
      `Based on the founder's request, draft a clear, specific job description including: ` +
      `role title, key responsibilities (tailored to their actual tech stack, not generic), ` +
      `must-have skills, nice-to-have skills, and seniority level. ` +
      `Keep it under 250 words. Return plain text only, no markdown headers, no JSON.`;

    const userMessage = extractedContext
      ? `${message}\n\nContext: ${extractedContext}`
      : message;

    console.log('[hiring] Calling Ollama with profile context:', { techStack, industry, stage });
    console.log('[hiring] User message:', userMessage);

    // ── Step 2: Call Ollama ───────────────────────────────────────────────────
    const draft = await callOllama(systemPrompt, userMessage, 350);

    console.log('[hiring] Ollama draft length:', draft.length, 'chars');

    // ── Step 3: Insert into agent_actions ────────────────────────────────────
    console.log('[hiring] Inserting agent_actions row for founderId:', founderId);

    const { error: dbError } = await supabase.from('agent_actions').insert({
      founder_id:        founderId,
      agent_type:        'hiring',
      input_message:     message,
      output_draft:      { text: draft },
      requires_approval: true,
      status:            'pending',
    });

    if (dbError) {
      console.warn('[hiring] Supabase insert error (non-fatal):', dbError.message);
    } else {
      console.log('[hiring] agent_actions row inserted successfully');
    }

    // ── Step 4: Return API contract response ──────────────────────────────────
    const response: AgentResponse = {
      agentUsed:        'hiring',
      draft,
      requiresApproval: true,
      summary:          `Drafted job description for ${extractedContext || message}`,
    };

    console.log('[hiring] Returning response:', { agentUsed: response.agentUsed, summary: response.summary });

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[hiring] Unhandled error:', message);
    return NextResponse.json({ error: `Hiring agent failed: ${message}` }, { status: 500 });
  }
}
