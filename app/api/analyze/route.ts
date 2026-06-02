import { NextRequest, NextResponse } from 'next/server'
import { analyzeMessage } from '@/lib/openai'
import { addMessage } from '@/lib/message-store'

// Manual test endpoint — paste any text to simulate a message
export async function POST(req: NextRequest) {
  const { text, senderId, senderName } = await req.json()

  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  const result = await analyzeMessage(text)
  const msg = await addMessage(
    senderId ?? 'manual_test',
    senderName ?? 'Test User',
    text,
    result.language,
    result.translatedZh,
    result.suggestedReply,
    result.suggestedReplyZh
  )

  return NextResponse.json(msg)
}
