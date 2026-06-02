'use client'

import { useState, useEffect, useRef } from 'react'

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
  } catch {}
}

export default function InboxPage() {
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [selected, setSelected] = useState<DemoMessage | null>(null)
  const [showDetail, setShowDetail] = useState(false) // mobile: toggle list/detail
  const [testInput, setTestInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [copied, setCopied] = useState(false)
  const [zhDraft, setZhDraft] = useState('')
  const [translatedReply, setTranslatedReply] = useState('')
  const [translating, setTranslating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: show localStorage instantly, then sync from KV
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored.length > 0) {
      setMessages(stored)
      setSelected(stored[0])
    }
    fetch('/api/messages')
      .then((r) => r.json())
      .then((data: DemoMessage[]) => {
        if (data.length > 0) {
          setMessages(data)
          setSelected(data[0])
          saveToStorage(data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selected) {
      setZhDraft(selected.suggestedReplyZh)
      setTranslatedReply(selected.suggestedReply)
      setSendError('')
    }
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectMessage(msg: DemoMessage) {
    setSelected(msg)
    setShowDetail(true)
  }

  function handleZhDraftChange(value: string) {
    setZhDraft(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setTranslatedReply(''); return }
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
    setAnalyzeError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testInput }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setAnalyzeError(err.error ?? `请求失败 (${res.status})`)
        return
      }
      const msg: DemoMessage = await res.json()
      setMessages((prev) => {
        const updated = [msg, ...prev]
        saveToStorage(updated)
        return updated
      })
      setSelected(msg)
      setShowDetail(true)
      setTestInput('')
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : '网络错误，请重试')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSend() {
    if (!selected || !translatedReply.trim()) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selected.senderId,
          message: translatedReply,
          messageId: selected.id,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSendError(err.error ?? `发送失败 (${res.status})`)
        return
      }
      setMessages((prev) => {
        const updated = prev.map((m) => m.id === selected.id ? { ...m, sent: true } : m)
        saveToStorage(updated)
        return updated
      })
      setSelected((prev) => prev ? { ...prev, sent: true } : prev)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '网络错误，请重试')
    } finally {
      setSending(false)
    }
  }

  async function clearAll() {
    localStorage.removeItem(STORAGE_KEY)
    setMessages([])
    setSelected(null)
    setShowDetail(false)
    await fetch('/api/clear-messages', { method: 'DELETE' }).catch(() => {})
  }

  function handleCopy() {
    navigator.clipboard.writeText(translatedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // ── List panel ──────────────────────────────────────────────
  const listPanel = (
    <div className="flex flex-col h-full">
      {/* Test input */}
      <div className="p-3 border-b border-gray-100 bg-white">
        <p className="text-xs text-gray-400 font-medium mb-1.5">手动测试</p>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-xl p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows={3}
          placeholder="粘贴俄语 / 阿拉伯语 / 英语消息…"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze() }}
        />
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !testInput.trim()}
          className="mt-2 w-full text-sm bg-blue-600 text-white rounded-xl py-2 font-medium disabled:opacity-50 active:bg-blue-800 transition-colors"
        >
          {analyzing ? '分析中…' : '分析'}
        </button>
        {analyzeError && <p className="mt-1.5 text-xs text-red-500">{analyzeError}</p>}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            暂无消息<br />在上方输入测试
          </div>
        ) : (
          messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => selectMessage(msg)}
              className={`w-full text-left px-4 py-3.5 border-b border-gray-100 bg-white active:bg-blue-50 transition-colors ${
                selected?.id === msg.id ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold truncate">{msg.senderName}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-500 truncate mb-1.5">{msg.originalText}</p>
              <div className="flex gap-1.5">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{msg.language}</span>
                {msg.sent && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">已发送</span>}
              </div>
            </button>
          ))
        )}
        {messages.length > 0 && (
          <button
            onClick={clearAll}
            className="w-full py-4 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            清除所有记录
          </button>
        )}
      </div>
    </div>
  )

  // ── Detail panel ─────────────────────────────────────────────
  const detailPanel = selected ? (
    <div className="flex flex-col h-full">
      {/* Mobile back button */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={() => setShowDetail(false)}
          className="text-blue-600 text-sm font-medium flex items-center gap-1"
        >
          ← 返回
        </button>
        <span className="text-sm font-semibold truncate">{selected.senderName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <Section title="客户原文" badge={selected.language}>
          <p className="text-sm leading-relaxed">{selected.originalText}</p>
        </Section>

        <Section title="中文翻译">
          <p className="text-sm leading-relaxed text-gray-700">{selected.translatedZh}</p>
        </Section>

        <Section title="参考报价">
          <div className="grid grid-cols-2 gap-2">
            <QuoteStat label="估价范围" value={selected.fakeQuote.price} />
            <QuoteStat label="预计时效" value={selected.fakeQuote.delivery} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{selected.fakeQuote.note}</p>
        </Section>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">回复</h3>

          {/* Translated preview */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 min-h-[70px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-600">{selected.language}（发给客户）</span>
              {translating && <span className="text-xs text-blue-400 animate-pulse">翻译中…</span>}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {translatedReply || <span className="text-gray-400 text-xs">在下方输入中文，自动翻译</span>}
            </p>
          </div>

          {/* Chinese input */}
          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">中文回复</p>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[90px]"
              placeholder="用中文写回复，上方自动翻译…"
              value={zhDraft}
              onChange={(e) => handleZhDraftChange(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={!translatedReply}
              className="flex-1 text-sm border border-gray-300 rounded-xl py-2.5 disabled:opacity-40 active:bg-gray-100 transition-colors"
            >
              {copied ? '✓ 已复制' : '复制'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selected.sent || !translatedReply}
              className="flex-1 text-sm bg-blue-600 text-white rounded-xl py-2.5 font-medium disabled:opacity-50 active:bg-blue-800 transition-colors"
            >
              {selected.sent ? '✓ 已发送' : sending ? '发送中…' : '发送到 Messenger'}
            </button>
          </div>
          {sendError && <p className="text-xs text-red-500">{sendError}</p>}
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          {selected.senderName} · {new Date(selected.createdAt).toLocaleString('zh-CN')}
        </p>
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
      选择左侧消息查看分析
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          A
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">Auto Export Copilot</p>
          <p className="text-xs text-gray-400 leading-tight">Facebook Messenger · AI Sales Inbox</p>
        </div>
        <div className="ml-auto shrink-0">
          <span className="text-xs text-gray-400">Demo</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: two columns */}
        <aside className="hidden md:flex flex-col w-72 border-r border-gray-200">
          {listPanel}
        </aside>
        <main className="hidden md:flex flex-col flex-1 overflow-hidden">
          {detailPanel}
        </main>

        {/* Mobile: single column, toggle */}
        <div className="flex md:hidden flex-col flex-1 overflow-hidden">
          {!showDetail ? listPanel : detailPanel}
        </div>
      </div>
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        {badge && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function QuoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
