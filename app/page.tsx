'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type DemoMessage = {
  id: string
  senderId: string
  senderName: string
  originalText: string
  language: string
  translatedZh: string
  suggestedReply: string
  suggestedReplyZh: string
  fakeQuote: { price: string; delivery: string; note: string }
  createdAt: string
  sent: boolean
}

export default function InboxPage() {
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [selected, setSelected] = useState<DemoMessage | null>(null)
  const [testInput, setTestInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  // Reply composer state
  const [zhDraft, setZhDraft] = useState('')         // salesperson types Chinese here
  const [translatedReply, setTranslatedReply] = useState('')  // live-translated to customer language
  const [translating, setTranslating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const STORAGE_KEY = 'aec_messages'

  function loadFromStorage(): DemoMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as DemoMessage[]) : []
    } catch {
      return []
    }
  }

  function saveToStorage(msgs: DemoMessage[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
    } catch {
      // storage full or unavailable
    }
  }

  function clearStorage() {
    localStorage.removeItem(STORAGE_KEY)
    setMessages([])
    setSelected(null)
  }

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored.length > 0) {
      setMessages(stored)
      setSelected(stored[0])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When switching to a new message, pre-fill Chinese draft from suggestedReplyZh
  useEffect(() => {
    if (selected) {
      setZhDraft(selected.suggestedReplyZh)
      setTranslatedReply(selected.suggestedReply)
    }
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced translation: Chinese → customer language
  function handleZhDraftChange(value: string) {
    setZhDraft(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setTranslatedReply('')
      return
    }
    debounceRef.current = setTimeout(async () => {
      if (!selected) return
      setTranslating(true)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value, targetLanguage: selected.language }),
        })
        const { translated } = await res.json()
        setTranslatedReply(translated)
      } finally {
        setTranslating(false)
      }
    }, 800)
  }

  async function handleAnalyze() {
    if (!testInput.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testInput }),
      })
      const msg: DemoMessage = await res.json()
      setMessages((prev) => {
        const updated = [msg, ...prev]
        saveToStorage(updated)
        return updated
      })
      setSelected(msg)
      setTestInput('')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSend() {
    if (!selected || !translatedReply.trim()) return
    setSending(true)
    try {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selected.senderId,
          message: translatedReply,
          messageId: selected.id,
        }),
      })
      // Mark as sent locally
      setMessages((prev) => {
        const updated = prev.map((m) => m.id === selected.id ? { ...m, sent: true } : m)
        saveToStorage(updated)
        return updated
      })
      setSelected((prev) => prev ? { ...prev, sent: true } : prev)
    } finally {
      setSending(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(translatedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          A
        </div>
        <div>
          <div className="font-semibold text-sm">Auto Export Copilot</div>
          <div className="text-xs text-gray-400">Facebook Messenger · AI Sales Inbox</div>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-gray-400">Demo · 本地测试模式</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: message list */}
        <aside className="w-72 flex flex-col border-r border-gray-200 bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">手动测试</div>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
              placeholder="粘贴俄语/阿拉伯语/英语消息..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze()
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !testInput.trim()}
              className="mt-1 w-full text-sm bg-blue-600 text-white rounded-lg py-1.5 disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {analyzing ? '分析中…' : '分析 (⌘↩)'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {messages.length === 0 && (
              <div className="p-4 text-xs text-gray-400 text-center">
                暂无消息<br />在上方输入消息测试
              </div>
            )}
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelected(msg)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors ${
                  selected?.id === msg.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium truncate">{msg.senderName}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{msg.originalText}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {msg.language}
                  </span>
                  {msg.sent && (
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">已发送</span>
                  )}
                </div>
              </button>
            ))}
            {messages.length > 0 && (
              <button
                onClick={clearStorage}
                className="mt-auto mx-3 mb-3 text-xs text-gray-400 hover:text-red-400 transition-colors py-2 border border-dashed border-gray-200 rounded-lg hover:border-red-200"
              >
                清除所有记录
              </button>
            )}
          </div>
        </aside>

        {/* Right: analysis panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              选择左侧消息查看 AI 分析结果
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <Section title="客户原文" badge={selected.language}>
                <p className="text-sm leading-relaxed">{selected.originalText}</p>
              </Section>

              <Section title="中文翻译">
                <p className="text-sm leading-relaxed text-gray-700">{selected.translatedZh}</p>
              </Section>

              <Section title="参考报价">
                <div className="grid grid-cols-2 gap-3">
                  <QuoteStat label="估价范围" value={selected.fakeQuote.price} />
                  <QuoteStat label="预计时效" value={selected.fakeQuote.delivery} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{selected.fakeQuote.note}</p>
              </Section>

              {/* Reply composer */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">回复</h3>

                {/* Top: translated result (customer language) */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 min-h-[80px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-blue-600">
                      {selected.language}（发送给客户）
                    </span>
                    {translating && (
                      <span className="text-xs text-blue-400 animate-pulse">翻译中…</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {translatedReply || <span className="text-gray-400">在下方输入中文，自动翻译</span>}
                  </p>
                </div>

                {/* Bottom: Chinese input */}
                <div>
                  <div className="text-xs text-gray-400 mb-1 font-medium">中文回复（在这里输入）</div>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[100px]"
                    placeholder="用中文写回复，上方自动显示翻译结果…"
                    value={zhDraft}
                    onChange={(e) => handleZhDraftChange(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!translatedReply}
                    className="flex-1 text-sm border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    {copied ? '✓ 已复制' : '复制回复'}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || selected.sent || !translatedReply}
                    className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    {selected.sent ? '✓ 已发送' : sending ? '发送中…' : '发送到 Messenger'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-center">
                {selected.senderName} · {new Date(selected.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Section({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        {badge && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function QuoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  )
}
