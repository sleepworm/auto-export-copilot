import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'

export type DemoMessage = {
  id: string
  senderId: string
  senderName: string
  originalText: string
  language: string
  translatedZh: string
  suggestedReply: string
  suggestedReplyZh: string
  fakeQuote: {
    price: string
    delivery: string
    note: string
  }
  createdAt: string
  sent: boolean
}

const KV_KEY = 'aec:messages'
const MAX_MESSAGES = 50

export async function addMessage(
  senderId: string,
  senderName: string,
  originalText: string,
  language: string,
  translatedZh: string,
  suggestedReply: string,
  suggestedReplyZh: string
): Promise<DemoMessage> {
  const msg: DemoMessage = {
    id: uuidv4(),
    senderId,
    senderName,
    originalText,
    language,
    translatedZh,
    suggestedReply,
    suggestedReplyZh,
    fakeQuote: {
      price: '18,000 – 25,000 USD',
      delivery: '25–35 days',
      note: 'Final price depends on model, stock and shipping cost.',
    },
    createdAt: new Date().toISOString(),
    sent: false,
  }

  const existing = await getMessages()
  const updated = [msg, ...existing].slice(0, MAX_MESSAGES)
  await kv.set(KV_KEY, updated)
  return msg
}

export async function getMessages(): Promise<DemoMessage[]> {
  const data = await kv.get<DemoMessage[]>(KV_KEY)
  return data ?? []
}

export async function markSent(id: string, sentReply: string): Promise<boolean> {
  const messages = await getMessages()
  const idx = messages.findIndex((m) => m.id === id)
  if (idx === -1) return false
  messages[idx].sent = true
  messages[idx].suggestedReply = sentReply  // overwrite with what was actually sent
  await kv.set(KV_KEY, messages)
  return true
}
