import { NextResponse } from 'next/server'
import { getMessages } from '@/lib/message-store'

export async function GET() {
  return NextResponse.json(await getMessages())
}
