import { NextRequest, NextResponse } from 'next/server'
import { sendMessage } from '@/lib/facebook'
import { markSent } from '@/lib/message-store'

export async function POST(req: NextRequest) {
  const { recipientId, message, messageId } = await req.json()

  if (!recipientId || !message) {
    return NextResponse.json({ error: 'Missing recipientId or message' }, { status: 400 })
  }

  // Only send via Messenger if token is configured
  if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    await sendMessage(recipientId, message)
  }
  if (messageId) await markSent(messageId, message)

  return NextResponse.json({ ok: true })
}
