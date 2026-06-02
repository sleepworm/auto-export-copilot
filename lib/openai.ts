import OpenAI from 'openai'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

type AnalyzeResult = {
  language: string
  translatedZh: string
  suggestedReply: string
  suggestedReplyZh: string
}

const SYSTEM_PROMPT = `You are an assistant for a car export sales team.

Given a customer message from Facebook Messenger:
1. Detect the language.
2. Translate the customer message into Chinese (中文).
3. Generate a short professional reply in the customer's original language.
4. Translate that reply into Chinese (中文) so the salesperson understands what is being sent.
5. Do not provide exact car model details or prices.
6. Use only this estimated quote: price 18,000–25,000 USD, delivery 25–35 days.
7. Always add: "Final price depends on model, stock and shipping cost."

Return ONLY valid JSON, no markdown, no extra text:
{"language":"","translatedZh":"","suggestedReply":"","suggestedReplyZh":""}`

export async function analyzeMessage(text: string): Promise<AnalyzeResult> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(raw) as AnalyzeResult
  } catch {
    return {
      language: 'Unknown',
      translatedZh: text,
      suggestedReply: 'Thank you for your inquiry. We will get back to you shortly.',
      suggestedReplyZh: '感谢您的询问，我们会尽快回复您。',
    }
  }
}
