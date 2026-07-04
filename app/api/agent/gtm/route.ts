import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/types';

type GtmRequestBody = {
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
    const body = (await req.json()) as GtmRequestBody;
    const { founderId, message, extractedContext, founderProfile } = body;

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    const startupName = founderProfile?.startup_name ?? 'not specified';
    const industry    = founderProfile?.industry     ?? 'not specified';
    const stage       = founderProfile?.stage        ?? 'not specified';

    const systemPrompt =
      `You are a go-to-market specialist AI for early-stage startup founders. ` +
      `The founder's startup is ${startupName}, industry is ${industry}, stage is ${stage}. ` +
      `Draft the requested marketing asset (launch post, positioning statement, or landing page copy) ` +
      `tailored to their startup name and industry. ` +
      `Keep it under 180 words. Return plain text only, no markdown.`;

    const userMessage = extractedContext
      ? `${message}\n\nContext: ${extractedContext}`
      : message;

    console.log('[gtm] Calling Ollama with profile context:', { startupName, industry, stage });
    console.log('[gtm] User message:', userMessage);

    const draft = await callOllama(systemPrompt, userMessage, 250);

    console.log('[gtm] Ollama draft length:', draft.length, 'chars');
    console.log('[gtm] Inserting agent_actions row for founderId:', founderId);

    const { error: dbError } = await supabase.from('agent_actions').insert({
      founder_id:        founderId,
      agent_type:        'gtm',
      input_message:     message,
      output_draft:      { text: draft },
      requires_approval: false,
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
      requiresApproval: false,
      summary:          `Drafted go-to-market plan for ${extractedContext || message}`,
    };

    console.log('[gtm] Returning response:', { agentUsed: response.agentUsed, summary: response.summary });

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[gtm] Unhandled error:', message);
    return NextResponse.json({ error: `GTM agent failed: ${message}` }, { status: 500 });
  }
}
