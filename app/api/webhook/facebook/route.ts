import { NextRequest, NextResponse } from 'next/server'
import { analyzeMessage } from '@/lib/openai'
import { addMessage } from '@/lib/message-store'

// Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Receive messages from Facebook
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.object !== 'page') {
    return NextResponse.json({ error: 'Not a page event' }, { status: 400 })
  }

  // Respond 200 immediately — Meta requires fast response
  const entries: FacebookEntry[] = body.entry ?? []

  // Process async (fire-and-forget is fine for MVP)
  processEntries(entries).catch(console.error)

  return NextResponse.json({ ok: true })
}

type FacebookEntry = {
  messaging?: FacebookMessaging[]
}

type FacebookMessaging = {
  sender?: { id: string }
  message?: { text?: string; mid?: string }
}

async function processEntries(entries: FacebookEntry[]) {
  for (const entry of entries) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id
      const text = event.message?.text

      if (!senderId || !text) continue

      try {
        const result = await analyzeMessage(text)
        await addMessage(
          senderId,
          `User ${senderId.slice(-4)}`,
          text,
          result.language,
          result.translatedZh,
          result.suggestedReply,
          result.suggestedReplyZh
        )
      } catch (err) {
        console.error('Failed to process message:', err)
      }
    }
  }
}
