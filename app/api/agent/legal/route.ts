import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/types';

type LegalRequestBody = {
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
    const body = (await req.json()) as LegalRequestBody;
    const { founderId, message, extractedContext, founderProfile } = body;

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    const industry = founderProfile?.industry ?? 'not specified';
    const stage    = founderProfile?.stage    ?? 'not specified';

    const systemPrompt =
      `You are a legal specialist AI for early-stage startup founders. ` +
      `The founder's industry is ${industry}, stage is ${stage}. ` +
      `Draft the requested legal document (NDA, contract clause, or compliance checklist) in clear plain language. ` +
      `Always end with a note that this is a draft and requires review by a licensed lawyer. ` +
      `Keep it under 220 words. Return plain text only, no markdown.`;

    const userMessage = extractedContext
      ? `${message}\n\nContext: ${extractedContext}`
      : message;

    console.log('[legal] Calling Ollama with profile context:', { industry, stage });
    console.log('[legal] User message:', userMessage);

    const draft = await callOllama(systemPrompt, userMessage, 300);

    console.log('[legal] Ollama draft length:', draft.length, 'chars');
    console.log('[legal] Inserting agent_actions row for founderId:', founderId);

    const { error: dbError } = await supabase.from('agent_actions').insert({
      founder_id:        founderId,
      agent_type:        'legal',
      input_message:     message,
      output_draft:      { text: draft },
      requires_approval: true,
      status:            'pending',
    });

    if (dbError) {
      console.warn('[legal] Supabase insert error (non-fatal):', dbError.message);
    } else {
      console.log('[legal] agent_actions row inserted successfully');
    }

    const response: AgentResponse = {
      agentUsed:        'legal',
      draft,
      requiresApproval: true,
      summary:          `Drafted legal document for ${extractedContext || message}`,
    };

    console.log('[legal] Returning response:', { agentUsed: response.agentUsed, summary: response.summary });

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[legal] Unhandled error:', message);
    return NextResponse.json({ error: `Legal agent failed: ${message}` }, { status: 500 });
  }
}
