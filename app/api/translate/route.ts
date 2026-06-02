import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _client: OpenAI | null = null
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

export async function POST(req: NextRequest) {
  const { text, targetLanguage } = await req.json()

  if (!text?.trim() || !targetLanguage) {
    return NextResponse.json({ translated: '' })
  }

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Translate the following Chinese text into ${targetLanguage}. Return ONLY the translated text, nothing else.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
    max_tokens: 300,
  })

  const translated = response.choices[0]?.message?.content?.trim() ?? ''
  return NextResponse.json({ translated })
}
