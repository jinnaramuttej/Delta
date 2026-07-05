import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/types';

type GTMRequestBody = {
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
    const body = (await req.json()) as GTMRequestBody;
    const { founderId, message, extractedContext, founderProfile } = body;

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    const industry    = founderProfile?.industry    ?? 'not specified';
    const stage       = founderProfile?.stage       ?? 'not specified';
    const startupName = founderProfile?.startup_name ?? 'the startup';

    const contentType = extractedContext || message;

    const systemPrompt =
      `You are a go-to-market (GTM) specialist AI for early-stage startup founders. ` +
      `You write compelling marketing copy for startup launches and growth. ` +
      `Startup: ${startupName}. Industry: ${industry}. Stage: ${stage}. ` +
      `Write in a modern, confident, human tone. Be specific — avoid generic filler. ` +
      `If writing social captions, use 1-2 relevant emojis and a CTA. ` +
      `If writing a landing page, structure with headline, subheadline, 3 benefits, and a CTA. ` +
      `If writing a positioning statement, use the format: "For [target], [product] is the [category] that [differentiation], unlike [alternative]." ` +
      `Keep it under 200 words unless a landing page is requested (then up to 300 words). Return plain text only, no markdown.`;

    const userMessage = contentType
      ? `${message}\n\nContent Type: ${contentType}`
      : message;

    console.log('[gtm] Calling Ollama with profile context:', { industry, stage, startupName });
    console.log('[gtm] User message:', userMessage);

    const draft = await callOllama(systemPrompt, userMessage, 350);

    console.log('[gtm] Draft length:', draft.length, 'chars');

    const { error: dbError } = await supabase.from('agent_actions').insert({
      founder_id:        founderId,
      agent_type:        'gtm',
      input_message:     message,
      output_draft:      { text: draft },
      requires_approval: true,
      status:            'pending',
    });

    if (dbError) {
      console.warn('[gtm] Supabase insert error (non-fatal):', dbError.message);
    } else {
      console.log('[gtm] agent_actions row inserted successfully');
    }

    const response: AgentResponse = {
      agentUsed:        'gtm',
      draft,
      requiresApproval: true,
      summary:          `Drafted ${contentType} for ${startupName}`,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[gtm] Unhandled error:', message);
    return NextResponse.json({ error: `GTM agent failed: ${message}` }, { status: 500 });
  }
}
