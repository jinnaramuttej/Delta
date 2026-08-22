import { NextResponse } from 'next/server';
import { callOllama } from '@/lib/ollama';

export async function POST(req: Request) {
  try {
    const { queryText } = await req.json();

    const systemPrompt = "You are a helpful assistant.";
    const userMessage = `Generate exactly 3 realistic but clearly fictional example candidate profiles for this hiring role: "${queryText}". Return ONLY a raw JSON array matching this typescript shape: Array<{ name: string, role: string, experience: string, matchScore: number, skills: string[], availability: string, currentCompany: string, aiSummary: string, hiringRisk: 'Low' | 'Medium' | 'High' }>. Do not include markdown code block formatting or explanation, just the raw JSON.`;

    const rawText = await callOllama(systemPrompt, userMessage, 800);

    return NextResponse.json({ response: rawText });
  } catch (error: any) {
    console.error('[generate-candidates] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate candidates' }, { status: 500 });
  }
}
