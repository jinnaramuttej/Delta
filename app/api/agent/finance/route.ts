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

    // Fetch latest snapshot first
    const { data: snapshots } = await supabase
      .from('finance_snapshots')
      .select('cash_in_bank, monthly_burn, runway_months, created_at')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestSnap = snapshots?.[0] ?? null;
    const prevCash = latestSnap ? latestSnap.cash_in_bank : 0;
    const prevBurn = latestSnap ? latestSnap.monthly_burn : 0;

    const extractionPrompt =
      `Analyze the founder's message to see if they are updating or logging their financial numbers (cash balance/funding/money raised or monthly burn rate). ` +
      `Interpret terms like "cr" as Crore (1 Crore = 10,000,000 in India, i.e., 25cr = 250,000,000, 250cr = 2,500,000,000). "k" is thousands (e.g., 40k = 40,000). ` +
      `If the message mentions a change (e.g., "burning rate increased by 40k"), compute the absolute new value using the previous values. ` +
      `Previous Cash in bank = ${prevCash}, Previous Monthly Burn = ${prevBurn}. ` +
      `Return ONLY valid JSON in this exact shape: ` +
      `{"cash_in_bank": number | null, "monthly_burn": number | null}. ` +
      `No explanation, no markdown.`;

    let extractedFinance = { cash_in_bank: null, monthly_burn: null };
    try {
      const rawExt = await callOllama(extractionPrompt, message, 150);
      const cleanedExt = rawExt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsedExt = JSON.parse(cleanedExt);
      if (parsedExt) {
        if (typeof parsedExt.cash_in_bank === 'number') {
          extractedFinance.cash_in_bank = parsedExt.cash_in_bank;
        }
        if (typeof parsedExt.monthly_burn === 'number') {
          extractedFinance.monthly_burn = parsedExt.monthly_burn;
        }
      }
    } catch (e) {
      console.warn('Failed to extract financial data from message:', e);
    }

    // If we extracted new financial values, insert a new snapshot!
    let activeSnap = latestSnap;
    if (extractedFinance.cash_in_bank !== null || extractedFinance.monthly_burn !== null) {
      const newCash = extractedFinance.cash_in_bank !== null ? extractedFinance.cash_in_bank : (latestSnap?.cash_in_bank ?? 0);
      const newBurn = extractedFinance.monthly_burn !== null ? extractedFinance.monthly_burn : (latestSnap?.monthly_burn ?? 0);
      const runway = newBurn > 0 ? (newCash / newBurn) : 0;

      const uuid = crypto.randomUUID();
      const { data: newInsert, error: insertErr } = await supabase.from('finance_snapshots').insert({
        id: uuid,
        founder_id: founderId,
        cash_in_bank: newCash,
        monthly_burn: newBurn,
        runway_months: runway
      }).select();

      if (!insertErr && newInsert && newInsert.length > 0) {
        activeSnap = newInsert[0];
        console.log('[finance] Successfully logged new finance snapshot from user message:', activeSnap);
      } else if (insertErr) {
        console.error('[finance] Failed to insert extracted finance snapshot:', insertErr.message);
      }
    }

    let snapshotContext = 'No finance snapshots have been logged yet by the founder.';
    if (activeSnap) {
      const runway = activeSnap.runway_months ? activeSnap.runway_months.toFixed(1) : null;

      snapshotContext =
        `Latest logged snapshot: ` +
        `Cash Balance = $${activeSnap.cash_in_bank?.toLocaleString() ?? 'N/A'}, ` +
        `Monthly Burn = $${activeSnap.monthly_burn?.toLocaleString() ?? 'N/A'}` +
        (runway ? `, Computed Runway = ${runway} months` : '') +
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
