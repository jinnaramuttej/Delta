export async function callOllama(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 300
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/chat';
  const model = process.env.OLLAMA_MODEL ?? 'qwen3:8b';

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
  return data.message.content as string;
}
