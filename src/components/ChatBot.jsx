import { useEffect, useRef, useState } from 'react'
import {
  Bot, Send, X, Sparkles, Check, Calendar, Folder, User, Flag,
  Link as LinkIcon, Zap, Edit3, MessageCircle, AlertCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { PRIORITY_LABEL, TASK_STATUS_LABEL } from '../data/mockData.js'
import { deriveJiraLink, formatDate } from '../utils/format.js'

const OPEN_KEY = 'tm_chatbot_open'

// ============== SLASH COMMANDS ==============
// `template` = chữ điền sẵn vào input
// `autoSubmit` = gửi luôn sau khi chọn (không cần điền thêm)
// `action: 'help'` = chạy local, không gửi AI
const SLASH_COMMANDS = [
  { cmd: '/help',     label: 'Xem hướng dẫn',                  hint: 'liệt kê các lệnh',       action: 'help' },
  { cmd: '/who',      label: 'Ai đang làm gì?',                hint: 'liệt kê task theo người', template: 'ai đang làm gì hôm nay?', autoSubmit: true },
  { cmd: '/free',     label: 'Ai đang rảnh?',                  hint: 'những người ít task nhất', template: 'ai đang rảnh nhất?', autoSubmit: true },
  { cmd: '/overdue',  label: 'Task quá hạn',                   hint: 'liệt kê task đã quá hạn', template: 'task nào đang quá hạn?', autoSubmit: true },
  { cmd: '/builds',   label: 'Build đang chờ',                 hint: 'build chưa xong',          template: 'build nào đang chờ xử lý?', autoSubmit: true },
  { cmd: '/summary',  label: 'Tóm tắt hôm nay',                hint: 'tổng hợp tình hình team',  template: 'tóm tắt tình hình team hôm nay (số task đang làm, quá hạn, build chờ)', autoSubmit: true },
  { cmd: '/standup',  label: 'Chuẩn bị standup',               hint: 'ai làm gì, ai block ai',   template: 'chuẩn bị nội dung standup sáng mai: ai đang làm gì, ai đang block, ai cần help', autoSubmit: true },
  { cmd: '/create',   label: 'Tạo task...',                    hint: 'điền tiếp tiêu đề',         template: 'tạo task ' },
  { cmd: '/done',     label: 'Đánh dấu xong...',               hint: 'điền tên/mã task',           template: 'đánh dấu ' },
  { cmd: '/assign',   label: 'Đổi assignee...',                hint: 'điền task và người',         template: 'đổi assignee task ' },
  { cmd: '/extend',   label: 'Gia hạn task...',                hint: 'điền task và ngày',         template: 'gia hạn task ' },
]

export default function ChatBot() {
  const { members, projects, currentUserId, addTask, updateTask, getMember, getProject } = useApp()

  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) === '1')
  useEffect(() => {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  }, [open])

  const [aiEnabled, setAiEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    api.get('/ai/status')
      .then((r) => { if (!cancelled) setAiEnabled(!!r?.enabled) })
      .catch(() => { if (!cancelled) setAiEnabled(false) })
    return () => { cancelled = true }
  }, [])

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'bot',
      kind: 'text',
      content:
        'Chào! Gõ "/" để mở menu lệnh nhanh, hoặc nói tự nhiên:\n' +
        '• Tạo: "tạo task HNCW-348 cho Chiến hạn mai"\n' +
        '• Tạo nhiều: "tạo 3 task FE: sửa header, fix CSS, review PR"\n' +
        '• Cập nhật: "đánh dấu HNCW-348 xong", "gia hạn task X đến 25/5"\n' +
        '• Hỏi: "ai đang quá hạn?", "tóm tắt hôm nay"',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [slashIdx, setSlashIdx] = useState(0)
  const textareaRef = useRef(null)

  // Menu mở khi input bắt đầu bằng "/" và chưa có khoảng trắng/xuống dòng
  const slashOpen = input.startsWith('/') && !/[\s\n]/.test(input)
  const slashFiltered = slashOpen
    ? SLASH_COMMANDS.filter((c) => c.cmd.toLowerCase().startsWith(input.toLowerCase()))
    : []

  useEffect(() => {
    // Reset selection khi danh sách filter thay đổi
    setSlashIdx(0)
  }, [input])

  const listRef = useRef(null)
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open, thinking])

  const pushBot = (msg) => setMessages((m) => [...m, { id: `b-${Date.now()}-${Math.random()}`, role: 'bot', ...msg }])
  const patchMessage = (id, patch) => setMessages((m) => m.map((x) => x.id === id ? { ...x, ...patch } : x))

  const showHelp = () => {
    const lines = SLASH_COMMANDS.map((c) => `${c.cmd.padEnd(10)} ${c.label}`).join('\n')
    pushBot({
      kind: 'text',
      content:
        'Các lệnh nhanh (gõ "/" để mở menu):\n' + lines +
        '\n\nHoặc gõ tự do bằng tiếng Việt — AI sẽ tự hiểu intent.',
    })
  }

  const selectCommand = (cmd) => {
    if (cmd.action === 'help') {
      setInput('')
      showHelp()
      return
    }
    if (cmd.autoSubmit) {
      setInput('')
      submit(cmd.template)
    } else {
      setInput(cmd.template)
      // Giữ focus + để cursor cuối input
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(cmd.template.length, cmd.template.length)
        }
      })
    }
  }

  const submit = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim()
    if (!text || thinking) return
    if (overrideText === undefined) setInput('')

    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', kind: 'text', content: text }])
    setThinking(true)

    try {
      if (aiEnabled) {
        const r = await api.post('/ai/chat', { text, currentUserId })
        handleAiResult(r, text)
      } else {
        const local = parseCommand(text, { members, projects, currentUserId })
        if (local.error) {
          pushBot({ kind: 'text', tone: 'error', content: local.error })
        } else {
          pushBot({
            kind: 'create_task',
            content: 'Bấm "Tạo task" để xác nhận:',
            previews: [local.preview],
          })
        }
      }
    } catch (e) {
      // AI lỗi → fallback parser nội bộ cho lệnh tạo
      const local = parseCommand(text, { members, projects, currentUserId })
      if (!local.error) {
        pushBot({
          kind: 'create_task',
          content: `(AI lỗi: ${e.message} — dùng parser nội bộ) Bấm "Tạo task":`,
          previews: [local.preview],
        })
      } else {
        pushBot({
          kind: 'text',
          tone: 'error',
          content: `AI lỗi: ${e.message}. Parser nội bộ cũng không hiểu lệnh.`,
        })
      }
    } finally {
      setThinking(false)
    }
  }

  const handleAiResult = (r, originalText) => {
    const { intent, message, tasks, update, answer } = r || {}
    switch (intent) {
      case 'create_task':
      case 'create_tasks': {
        const previews = (tasks || [])
          .map((t) => normalizePreview(t, { members, projects, currentUserId }))
          .filter(Boolean)
        if (previews.length === 0) {
          pushBot({ kind: 'text', tone: 'error', content: 'AI không trả về task hợp lệ.' })
          break
        }
        pushBot({
          kind: previews.length > 1 ? 'create_tasks' : 'create_task',
          content: message || (previews.length > 1 ? `Tạo ${previews.length} task này?` : 'Tạo task này?'),
          previews,
        })
        break
      }
      case 'update_task': {
        pushBot({ kind: 'update_task', content: message || 'Cập nhật task này?', update })
        break
      }
      case 'query': {
        pushBot({ kind: 'query', content: message, answer: answer || message })
        break
      }
      default: {
        // unknown — fallback parser nội bộ cho lệnh tạo
        const local = parseCommand(originalText, { members, projects, currentUserId })
        if (!local.error) {
          pushBot({
            kind: 'create_task',
            content: `${message || 'AI không chắc.'} Parser nội bộ thử:`,
            previews: [local.preview],
          })
        } else {
          pushBot({ kind: 'text', tone: 'info', content: message || 'Không hiểu lệnh.' })
        }
      }
    }
  }

  // ===== Actions =====
  const confirmCreate = async (msgId, previews) => {
    patchMessage(msgId, { busy: true })
    let created = 0
    try {
      for (const p of previews) {
        await addTask({
          title: p.title,
          description: '',
          link: p.link || null,
          assigneeId: p.assigneeId,
          projectId: p.projectId,
          status: 'todo',
          priority: p.priority,
          dueDate: p.dueDate || null,
        })
        created++
      }
      patchMessage(msgId, { busy: false, done: true, doneCount: created })
    } catch {
      // AppContext đã hiện toast
      patchMessage(msgId, { busy: false, doneCount: created })
    }
  }

  const confirmUpdate = async (msgId, update) => {
    patchMessage(msgId, { busy: true })
    try {
      const patch = { ...update.patch }
      // Chuẩn hoá dueDate nếu là YYYY-MM-DD (BE đã convert nhưng phòng case lệch)
      if (patch.dueDate && !patch.dueDate.includes('T')) {
        const d = new Date(patch.dueDate)
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999)
          patch.dueDate = d.toISOString()
        }
      }
      // Bỏ null/undefined để không ghi đè
      Object.keys(patch).forEach((k) => {
        if (patch[k] == null) delete patch[k]
      })
      await updateTask(update.taskId, patch)
      patchMessage(msgId, { busy: false, done: true })
    } catch {
      patchMessage(msgId, { busy: false })
    }
  }

  const cancel = (msgId) => patchMessage(msgId, { cancelled: true })

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          title="Trợ lý team"
        >
          <Bot size={24} />
        </button>
      )}

      {open && (
        <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-[420px] bg-white shadow-2xl border-l border-gray-200 flex flex-col slide-in-right">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
                Trợ lý team
                {aiEnabled ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100" title="AI (NVIDIA) đã sẵn sàng">
                    <Zap size={9} /> AI
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium" title="Chưa cấu hình AI">
                    local
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500">Tạo · Cập nhật · Hỏi đáp</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50/50">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                msg={m}
                getMember={getMember}
                getProject={getProject}
                onConfirmCreate={() => confirmCreate(m.id, m.previews)}
                onConfirmUpdate={() => confirmUpdate(m.id, m.update)}
                onCancel={() => cancel(m.id)}
              />
            ))}
            {thinking && <ThinkingDots />}
          </div>

          <div className="relative px-3 py-2.5 border-t border-gray-100 bg-white">
            {slashOpen && slashFiltered.length > 0 && (
              <div className="absolute left-3 right-3 bottom-full mb-1 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto z-10">
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-gray-400 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span>Lệnh nhanh · {slashFiltered.length}</span>
                  <span className="font-normal normal-case text-gray-400">↑↓ chọn · ⏎ ok · Esc đóng</span>
                </div>
                {slashFiltered.map((c, i) => (
                  <button
                    key={c.cmd}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectCommand(c) }}
                    onMouseEnter={() => setSlashIdx(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      i === slashIdx ? 'bg-brand-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-brand-700 w-16 shrink-0">{c.cmd}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-gray-800">{c.label}</span>
                      {c.hint && <span className="text-[11px] text-gray-400 ml-1">— {c.hint}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (slashOpen && slashFiltered.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setSlashIdx((i) => (i + 1) % slashFiltered.length)
                      return
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setSlashIdx((i) => (i - 1 + slashFiltered.length) % slashFiltered.length)
                      return
                    }
                    if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                      e.preventDefault()
                      selectCommand(slashFiltered[slashIdx])
                      return
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setInput('')
                      return
                    }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder='Gõ "/" để xem lệnh — hoặc gõ tự do tiếng Việt'
                rows={2}
                className="flex-1 input resize-none text-sm py-2"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || thinking}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Gửi (Enter)"
              >
                <Send size={14} />
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-center">
              {aiEnabled
                ? 'AI (NVIDIA NIM) · gõ "/" để xem lệnh nhanh'
                : 'Parser nội bộ · cấu hình NvidiaApiKey ở BE để bật AI'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============== MESSAGE RENDERER ==============

function ChatMessage({ msg, getMember, getProject, onConfirmCreate, onConfirmUpdate, onCancel }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 text-white px-3 py-2 text-sm whitespace-pre-line">
          {msg.content}
        </div>
      </div>
    )
  }

  const Icon = msg.kind === 'query' ? MessageCircle
    : msg.kind === 'update_task' ? Edit3
    : msg.tone === 'error' ? AlertCircle
    : Bot
  const iconCls = msg.tone === 'error'
    ? 'bg-rose-50 text-rose-600'
    : msg.kind === 'query'
      ? 'bg-violet-50 text-violet-600'
      : 'bg-brand-50 text-brand-600'

  return (
    <div className="flex gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        {msg.content && (
          <div className={`rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-line border ${
            msg.tone === 'error'
              ? 'bg-rose-50/60 border-rose-200 text-rose-800'
              : 'bg-white border-gray-200 text-gray-800'
          }`}>
            {msg.content}
          </div>
        )}

        {/* Query answer */}
        {msg.kind === 'query' && msg.answer && msg.answer !== msg.content && (
          <div className="mt-2 rounded-xl bg-violet-50/60 border border-violet-200 px-3 py-2 text-sm text-gray-800 whitespace-pre-line">
            {msg.answer}
          </div>
        )}

        {/* Create previews */}
        {(msg.kind === 'create_task' || msg.kind === 'create_tasks') && msg.previews && !msg.cancelled && (
          <CreatePreviews
            previews={msg.previews}
            done={msg.done}
            doneCount={msg.doneCount}
            busy={msg.busy}
            getMember={getMember}
            getProject={getProject}
            onConfirm={onConfirmCreate}
            onCancel={onCancel}
          />
        )}

        {/* Update preview */}
        {msg.kind === 'update_task' && msg.update && !msg.cancelled && (
          <UpdatePreview
            update={msg.update}
            done={msg.done}
            busy={msg.busy}
            getMember={getMember}
            onConfirm={onConfirmUpdate}
            onCancel={onCancel}
          />
        )}

        {msg.cancelled && (
          <div className="mt-2 text-[11px] text-gray-400 italic">Đã huỷ.</div>
        )}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Bot size={14} />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 text-gray-500 px-3 py-2 text-sm inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]" />
        <span className="ml-1 text-[11px]">Đang phân tích...</span>
      </div>
    </div>
  )
}

// ============== CREATE PREVIEWS (1 or many) ==============

function CreatePreviews({ previews, done, doneCount, busy, getMember, getProject, onConfirm, onCancel }) {
  const single = previews.length === 1
  if (done) {
    return (
      <div className="mt-2 p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-800 flex items-center gap-1.5">
        <Check size={12} /> Đã tạo {doneCount}/{previews.length} task
      </div>
    )
  }
  return (
    <div className="mt-2 space-y-2">
      {previews.map((p, i) => (
        <PreviewCard key={i} preview={p} getMember={getMember} getProject={getProject} />
      ))}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-1.5 rounded-md disabled:opacity-50"
        >
          {busy ? 'Đang tạo...' : single ? 'Tạo task' : `Tạo cả ${previews.length} task`}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-3 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-md disabled:opacity-50"
        >
          Huỷ
        </button>
      </div>
    </div>
  )
}

function PreviewCard({ preview, getMember, getProject }) {
  const member = getMember(preview.assigneeId)
  const project = getProject(preview.projectId)
  return (
    <div className="p-2.5 rounded-xl border border-brand-200 bg-brand-50/40">
      <div className="font-medium text-sm text-gray-800 mb-1">{preview.title}</div>
      <div className="text-[11px] text-gray-600 space-y-0.5">
        {member && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="text-gray-400" />
            <span>{member.name}</span><span className="text-gray-400">· {member.role}</span>
          </div>
        )}
        {project && (
          <div className="flex items-center gap-1.5">
            <Folder size={11} className="text-gray-400" />
            <span>{project.name}</span><span className="text-gray-400">[{project.code}]</span>
          </div>
        )}
        {preview.dueDate && (
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-gray-400" />
            <span>Hạn {formatDate(preview.dueDate)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Flag size={11} className="text-gray-400" />
          <span>Ưu tiên {PRIORITY_LABEL[preview.priority]}</span>
        </div>
        {preview.link && (
          <div className="flex items-center gap-1.5 truncate">
            <LinkIcon size={11} className="text-gray-400 shrink-0" />
            <span className="truncate text-brand-700">{preview.link}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============== UPDATE PREVIEW ==============

function UpdatePreview({ update, done, busy, getMember, onConfirm, onCancel }) {
  if (done) {
    return (
      <div className="mt-2 p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-800 flex items-center gap-1.5">
        <Check size={12} /> Đã cập nhật task
      </div>
    )
  }
  const patch = update.patch || {}
  const changes = []
  if (patch.status)     changes.push({ icon: Check,    label: 'Trạng thái', value: TASK_STATUS_LABEL[patch.status] || patch.status })
  if (patch.assigneeId) {
    const m = getMember(patch.assigneeId)
    changes.push({ icon: User, label: 'Người làm', value: m ? `${m.name} (${m.role})` : patch.assigneeId })
  }
  if (patch.priority)   changes.push({ icon: Flag,     label: 'Ưu tiên',   value: PRIORITY_LABEL[patch.priority] || patch.priority })
  if (patch.dueDate)    changes.push({ icon: Calendar, label: 'Hạn',        value: formatDate(patch.dueDate) })
  if (patch.title)      changes.push({ icon: Edit3,    label: 'Tiêu đề',    value: patch.title })

  return (
    <div className="mt-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
      <div className="text-xs text-gray-500">Cập nhật task:</div>
      <div className="font-medium text-sm text-gray-800">{update.taskTitle || update.taskId}</div>
      {changes.length === 0 ? (
        <div className="text-[11px] text-gray-500 italic">Không có thay đổi cụ thể.</div>
      ) : (
        <div className="text-[11px] text-gray-700 space-y-0.5">
          {changes.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <c.icon size={11} className="text-gray-400" />
              <span className="text-gray-500">{c.label}:</span>
              <span className="font-medium text-gray-800">{c.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          disabled={busy || changes.length === 0}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-1.5 rounded-md disabled:opacity-50"
        >
          {busy ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-3 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-md disabled:opacity-50"
        >
          Huỷ
        </button>
      </div>
    </div>
  )
}

// ============== HELPERS ==============

function normalizePreview(aiResult, { members, projects, currentUserId }) {
  if (!aiResult || !aiResult.title) return null
  const validAssignee = members.some((m) => m.id === aiResult.assigneeId)
  const validProject  = projects.some((p) => p.id === aiResult.projectId)
  return {
    title: aiResult.title,
    link: aiResult.link || deriveJiraLink(aiResult.title) || null,
    assigneeId: validAssignee ? aiResult.assigneeId : currentUserId,
    projectId: validProject ? aiResult.projectId : projects[0]?.id || '',
    priority: ['low', 'medium', 'high', 'urgent'].includes(aiResult.priority)
      ? aiResult.priority
      : 'medium',
    dueDate: aiResult.dueDate || null,
  }
}

/* =========================================================
   PARSER nội bộ — fallback khi AI chưa có/lỗi.
   Chỉ làm 1 việc: tạo 1 task theo cú pháp đơn giản.
   ========================================================= */

function parseCommand(text, { members, projects, currentUserId }) {
  let working = text.trim()
  working = working.replace(/^(?:tạo\s+)?task\s+/i, '').trim()

  const markerRe = /\s+(?=(?:cho|giao\s+cho|hạn|ưu\s+tiên|dự\s+án)\s+)/i
  const splitIdx = working.search(markerRe)
  let title, meta
  if (splitIdx === -1) {
    title = working
    meta = ''
  } else {
    title = working.slice(0, splitIdx).trim()
    meta = working.slice(splitIdx).trim()
  }

  if (!title) {
    return { error: 'Không hiểu được tiêu đề. Ví dụ: "tạo task HNCW-348 fix login cho Chiến hạn mai ưu tiên cao"' }
  }

  let priority = 'medium'
  if (/ưu\s+tiên\s+(khẩn\s+cấp|gấp|urgent)/i.test(meta)) priority = 'urgent'
  else if (/ưu\s+tiên\s+(cao|high)/i.test(meta)) priority = 'high'
  else if (/ưu\s+tiên\s+(thấp|low)/i.test(meta)) priority = 'low'

  let dueDate = null
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const ddmm = meta.match(/hạn\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i)
  if (ddmm) {
    const d = parseInt(ddmm[1], 10)
    const mo = parseInt(ddmm[2], 10) - 1
    const y = ddmm[3]
      ? ddmm[3].length === 2 ? 2000 + parseInt(ddmm[3], 10) : parseInt(ddmm[3], 10)
      : today.getFullYear()
    const dt = new Date(y, mo, d, 23, 59, 59)
    if (!isNaN(dt.getTime())) dueDate = dt.toISOString()
  } else if (/hạn\s+ngày\s+kia/i.test(meta)) {
    const dt = new Date(today); dt.setDate(dt.getDate() + 2); dueDate = dt.toISOString()
  } else if (/hạn\s+mai/i.test(meta)) {
    const dt = new Date(today); dt.setDate(dt.getDate() + 1); dueDate = dt.toISOString()
  } else if (/hạn\s+hôm\s+nay/i.test(meta)) {
    dueDate = today.toISOString()
  }

  let assigneeId = currentUserId
  const asMatch = meta.match(/(?:giao\s+)?cho\s+([\p{L}\s]+?)(?=\s+(?:hạn|ưu\s+tiên|dự\s+án|giao\s+cho)\b|$)/iu)
  if (asMatch) {
    const found = findMemberByName(members, asMatch[1].trim())
    if (found) assigneeId = found.id
  }

  let projectId = projects[0]?.id || ''
  const prMatch = meta.match(/dự\s+án\s+([\p{L}\d-]+(?:\s+[\p{L}\d-]+)*?)(?=\s+(?:cho|hạn|ưu\s+tiên|giao\s+cho)\b|$)/iu)
  if (prMatch) {
    const q = prMatch[1].trim().toLowerCase()
    const found = projects.find((p) => p.code.toLowerCase() === q || p.name.toLowerCase().includes(q))
    if (found) projectId = found.id
  }

  const link = deriveJiraLink(title)
  return {
    preview: { title, link: link || null, assigneeId, projectId, priority, dueDate },
  }
}

function findMemberByName(members, query) {
  const q = query.toLowerCase().trim()
  if (!q) return null
  let m = members.find((x) => x.name.toLowerCase() === q)
  if (m) return m
  m = members.find((x) => {
    const parts = x.name.toLowerCase().split(/\s+/)
    return parts[parts.length - 1] === q
  })
  if (m) return m
  return members.find((x) => x.name.toLowerCase().includes(q))
}
