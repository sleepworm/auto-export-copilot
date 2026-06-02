import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  const token = process.env.AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: '服务器未配置 AUTH_TOKEN' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.redirect('/')
  res.cookies.delete('auth_token')
  return res
}
