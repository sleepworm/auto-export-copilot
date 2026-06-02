import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function DELETE() {
  await kv.del('aec:messages')
  return NextResponse.json({ ok: true })
}
