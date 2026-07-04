export async function callOllama(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 300
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/chat';
  const model = process.env.OLLAMA_MODEL ?? process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'phi3';

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
}
