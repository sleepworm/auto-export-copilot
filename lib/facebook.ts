const FB_API = 'https://graph.facebook.com/v21.0/me/messages'

export async function sendMessage(
  recipientId: string,
  text: string
): Promise<void> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not set')

  const res = await fetch(`${FB_API}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Facebook API error: ${res.status} ${body}`)
  }
}
