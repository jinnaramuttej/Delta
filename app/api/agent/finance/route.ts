import { NextRequest, NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';
import { supabase } from '@/lib/supabase';
import type { AgentResponse } from '@/lib/types';

type FinanceRequestBody = {
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
    const body = (await req.json()) as FinanceRequestBody;
    const { founderId, message, extractedContext, founderProfile } = body;

    if (!founderId || !message) {
      return NextResponse.json(
        { error: 'founderId and message are required' },
        { status: 400 }
      );
    }

    const stage    = founderProfile?.stage    ?? 'not specified';
    const industry = founderProfile?.industry ?? 'not specified';

    // ── Fetch latest real finance snapshot from Supabase ──────────────────────
    const { data: snapshots } = await supabase
      .from('finance_snapshots')
      .select('cash_balance, monthly_burn, arr, mrr, notes, created_at')
      .eq('founder_id', founderId)
      .order('id', { ascending: false })
      .limit(1);

    const latestSnap = snapshots?.[0] ?? null;

    let snapshotContext = 'No finance snapshots have been logged yet by the founder.';
    if (latestSnap) {
      const runway =
        latestSnap.monthly_burn && latestSnap.monthly_burn > 0
          ? (latestSnap.cash_balance / latestSnap.monthly_burn).toFixed(1)
          : null;

      snapshotContext =
        `Latest logged snapshot: ` +
        `Cash Balance = $${latestSnap.cash_balance?.toLocaleString() ?? 'N/A'}, ` +
        `Monthly Burn = $${latestSnap.monthly_burn?.toLocaleString() ?? 'N/A'}, ` +
        `ARR = $${latestSnap.arr?.toLocaleString() ?? 'N/A'}, ` +
        `MRR = $${latestSnap.mrr?.toLocaleString() ?? 'N/A'}` +
        (runway ? `, Computed Runway = ${runway} months` : '') +
        (latestSnap.notes ? `, Notes: "${latestSnap.notes}"` : '') +
        `.`;
    }

    const systemPrompt =
      `You are a finance specialist AI for early-stage startup founders. ` +
      `The founder's stage is ${stage}, industry is ${industry}. ` +
      `IMPORTANT: Base your entire response on the founder's ACTUAL logged financial data below. ` +
      `Do NOT invent numbers or use generic examples. If data is missing, say so explicitly. ` +
      `${snapshotContext} ` +
      `Based on the founder's request and their real data, provide a clear analysis — ` +
      `burn rate, runway interpretation, or budget commentary. ` +
      `Keep it under 180 words. Return plain text only, no markdown.`;

    const userMessage = extractedContext
      ? `${message}\n\nContext: ${extractedContext}`
      : message;

    console.log('[finance] Snapshot context injected into prompt:', snapshotContext);
    console.log('[finance] User message:', userMessage);

    const draft = await callOllama(systemPrompt, userMessage, 250);

    console.log('[finance] Ollama draft length:', draft.length, 'chars');
    console.log('[finance] Inserting agent_actions row for founderId:', founderId);

    const { error: dbError } = await supabase.from('agent_actions').insert({
      founder_id:        founderId,
      agent_type:        'finance',
      input_message:     message,
      output_draft:      { text: draft },
      requires_approval: false,
      status:            'pending',
    });

    if (dbError) {
      console.warn('[finance] Supabase insert error (non-fatal):', dbError.message);
    } else {
      console.log('[finance] agent_actions row inserted successfully');
    }

    const response: AgentResponse = {
      agentUsed:        'finance',
      draft,
      requiresApproval: false,
      summary:          `Financial analysis for ${extractedContext || message}`,
    };

    console.log('[finance] Returning response:', { agentUsed: response.agentUsed, summary: response.summary });

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[finance] Unhandled error:', message);
    return NextResponse.json({ error: `Finance agent failed: ${message}` }, { status: 500 });
  }
}
