// ── OpenRouter fallback ───────────────────────────────────────────────────────
// Called when Ollama is unreachable (e.g. on Vercel / production deployments).
async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  // Map local Ollama model names to OpenRouter equivalents
  const localModel = process.env.OLLAMA_MODEL ?? 'qwen3:8b';
  const modelMap: Record<string, string> = {
    'qwen3:8b':  'meta-llama/llama-3.1-8b-instruct',
    'phi3':      'meta-llama/llama-3.1-8b-instruct',
    'phi3:mini': 'meta-llama/llama-3.1-8b-instruct',
    'llama3':    'meta-llama/llama-3.1-8b-instruct',
  };
  const orModel = modelMap[localModel] ?? 'meta-llama/llama-3.1-8b-instruct';

  console.log(`[openrouter] Calling model: ${orModel}`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://delta-ai.vercel.app',
      'X-Title': 'Delta AI',
    },
    body: JSON.stringify({
      model: orModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  console.log('[openrouter] Raw response choices:', JSON.stringify(data.choices?.[0]));
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Primary: Ollama → Fallback: OpenRouter ────────────────────────────────────
export async function callOllama(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 300
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/chat';
  const model = process.env.OLLAMA_MODEL ?? process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'phi3';

  try {
    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `/no_think ${systemPrompt}` },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        think: false,
        options: {
          temperature: 0.2,
          num_predict: maxTokens,
        },
      }),
      // Abort quickly if Ollama isn't running (avoids long hangs on Vercel)
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[ollama] Raw response:', JSON.stringify(data));

    const content = data.message?.content || '';
    const thinking = data.message?.thinking || '';

    if (!content && thinking) {
      console.warn('[ollama] Empty content returned, falling back to thinking field.');
      return thinking as string;
    }

    return content as string;

  } catch (ollamaErr) {
    console.warn('[ollama] Ollama unavailable, falling back to OpenRouter:', ollamaErr);
    return callOpenRouter(systemPrompt, userMessage, maxTokens);
  }
}
