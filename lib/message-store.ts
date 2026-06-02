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

const MAX_MESSAGES = 50

// global 保证 serverless 热重载时不丢失（冷启动仍会丢失）
declare global {
  // eslint-disable-next-line no-var
  var __messageStore: DemoMessage[] | undefined
}

function getStore(): DemoMessage[] {
  if (!global.__messageStore) {
    global.__messageStore = []
  }
  return global.__messageStore
}

export function addMessage(
  senderId: string,
  senderName: string,
  originalText: string,
  language: string,
  translatedZh: string,
  suggestedReply: string,
  suggestedReplyZh: string
): DemoMessage {
  const store = getStore()
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
  store.unshift(msg)
  if (store.length > MAX_MESSAGES) store.splice(MAX_MESSAGES)
  return msg
}

export function getMessages(): DemoMessage[] {
  return getStore()
}

export function markSent(id: string): boolean {
  const msg = getStore().find((m) => m.id === id)
  if (!msg) return false
  msg.sent = true
  return true
}
