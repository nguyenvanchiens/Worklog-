import { useMemo, useState } from 'react'
import {
  Inbox,
  AlertTriangle,
  Filter,
  Play,
  Trash2,
  ExternalLink,
  Flame,
  CalendarClock,
  Clock,
  Plus,
  Link as LinkIcon,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PRIORITY_LABEL, UNASSIGNED_ID } from '../data/mockData.js'
import Modal from '../components/common/Modal.jsx'
import ProjectCombobox from '../components/common/ProjectCombobox.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'
import { formatDate, isOverdue, timeFromNow, deriveJiraLink, isAutoJiraLink } from '../utils/format.js'

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }

const emptyForm = {
  title: '',
  description: '',
  link: '',
  projectId: '',
  priority: 'medium',
  dueDate: '',
}

// Task "tồn đọng chưa làm đến" = trạng thái "Chưa làm" (todo) VÀ chưa gán cho ai.
const BACKLOG_STATUS = 'todo'
// Quá số ngày này mà vẫn chưa làm thì coi là "để lâu".
const STALE_DAYS = 14

const isUnassigned = (t) => !t.assigneeId || t.assigneeId === UNASSIGNED_ID

function daysSince(dateStr) {
  if (!dateStr) return 0
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.floor(ms / 86_400_000)
}

export default function Backlog() {
  const {
    tasks,
    members,
    projects,
    addTask,
    updateTask,
    updateTaskStatus,
    removeTask,
  } = useApp()
  const { isLead } = useAuth()
  const confirm = useConfirm()

  const [filter, setFilter] = useState({ projectId: '', priority: '' })
  const [sort, setSort] = useState('oldest')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => {
    setForm({ ...emptyForm, projectId: projects[0]?.id ?? '' })
    setModalOpen(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addTask({
      ...form,
      assigneeId: UNASSIGNED_ID,   // tồn đọng = chưa gán cho ai
      status: BACKLOG_STATUS,      // todo
      link: form.link?.trim() || null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    })
    setModalOpen(false)
  }

  const backlog = useMemo(
    () => tasks.filter((t) => t.status === BACKLOG_STATUS && isUnassigned(t)),
    [tasks],
  )

  const filtered = useMemo(() => {
    const list = backlog.filter((t) => {
      if (filter.projectId && t.projectId !== filter.projectId) return false
      if (filter.priority && t.priority !== filter.priority) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    } else if (sort === 'priority') {
      sorted.sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          new Date(a.createdAt) - new Date(b.createdAt),
      )
    } else if (sort === 'due') {
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
    }
    return sorted
  }, [backlog, filter, sort])

  const stats = useMemo(() => {
    const overdue = backlog.filter((t) => isOverdue(t.dueDate)).length
    const urgent = backlog.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
    const oldest = backlog.reduce((max, t) => Math.max(max, daysSince(t.createdAt)), 0)
    return { total: backlog.length, overdue, urgent, oldest }
  }, [backlog])

  const onStart = (t) => updateTaskStatus(t.id, 'in_progress')

  const onDelete = async (t) => {
    const ok = await confirm({
      title: 'Xoá task',
      message: `Bạn có chắc muốn xoá task "${t.title}"?`,
      confirmLabel: 'Xoá',
      tone: 'danger',
    })
    if (ok) removeTask(t.id)
  }

  return (
    <div className="space-y-4">
      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Inbox} tone="brand" label="Đang tồn đọng" value={stats.total} />
        <StatCard icon={AlertTriangle} tone={stats.overdue ? 'rose' : 'slate'} label="Quá hạn" value={stats.overdue} />
        <StatCard icon={Flame} tone={stats.urgent ? 'amber' : 'slate'} label="Ưu tiên cao/khẩn" value={stats.urgent} />
        <StatCard icon={Clock} tone={stats.oldest >= STALE_DAYS ? 'rose' : 'slate'} label="Cũ nhất (ngày)" value={stats.oldest} />
      </div>

      {/* FILTERS */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={16} /> Lọc:
        </div>
        <div>
          <label className="label">Dự án</label>
          <select
            className="input w-44"
            value={filter.projectId}
            onChange={(e) => setFilter((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ưu tiên</label>
          <select
            className="input w-36"
            value={filter.priority}
            onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <label className="label">Sắp xếp</label>
          <select
            className="input w-44"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="oldest">Tồn đọng lâu nhất</option>
            <option value="priority">Ưu tiên cao trước</option>
            <option value="due">Hạn gần nhất</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Inbox size={18} className="text-brand-600" />
          <div className="font-semibold text-gray-800 text-sm">Công việc chưa làm đến</div>
          <span className="text-xs text-gray-500">({filtered.length})</span>
          <button className="btn-primary ml-auto" onClick={openAdd}>
            <Plus size={16} /> Thêm tồn đọng
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Không có task tồn đọng 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 bg-gray-50/70 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium w-10">#</th>
                  <th className="px-4 py-2 font-medium">Công việc</th>
                  <th className="px-4 py-2 font-medium w-44">Dự án</th>
                  <th className="px-4 py-2 font-medium">Gán cho</th>
                  <th className="px-4 py-2 font-medium w-32">Ưu tiên</th>
                  <th className="px-4 py-2 font-medium w-36">Hạn</th>
                  <th className="px-4 py-2 font-medium w-32">Tồn đọng</th>
                  <th className="px-4 py-2 font-medium w-40 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t, i) => {
                  const overdue = isOverdue(t.dueDate)
                  const age = daysSince(t.createdAt)
                  const stale = age >= STALE_DAYS
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 align-top">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>

                      {/* Công việc */}
                      <td className="px-4 py-3">
                        {t.link ? (
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-800 hover:text-brand-700 hover:underline inline-flex items-start gap-1"
                          >
                            <span>{t.title}</span>
                            <ExternalLink size={11} className="opacity-60 mt-1 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-medium text-gray-800">{t.title}</span>
                        )}
                        {t.description && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</div>
                        )}
                      </td>

                      {/* Dự án — chọn / đổi dự án ngay trên dòng */}
                      <td className="px-4 py-3">
                        <select
                          className="input h-8 py-0 text-xs w-40"
                          value={t.projectId}
                          onChange={(e) => updateTask(t.id, { projectId: e.target.value })}
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Gán cho — chọn người sẽ đưa task ra khỏi tồn đọng */}
                      <td className="px-4 py-3">
                        <select
                          className="input h-8 py-0 text-xs w-40"
                          value={t.assigneeId || UNASSIGNED_ID}
                          onChange={(e) => updateTask(t.id, { assigneeId: e.target.value })}
                        >
                          <option value={UNASSIGNED_ID}>— Chưa gán —</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Ưu tiên */}
                      <td className="px-4 py-3">
                        <select
                          className="input h-8 py-0 text-xs w-28"
                          value={t.priority}
                          onChange={(e) => updateTask(t.id, { priority: e.target.value })}
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                          ))}
                        </select>
                      </td>

                      {/* Hạn */}
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          className={`input h-8 py-0 text-xs w-32 ${overdue ? 'border-red-300 text-red-600' : ''}`}
                          value={t.dueDate ? t.dueDate.slice(0, 10) : ''}
                          onChange={(e) =>
                            e.target.value &&
                            updateTask(t.id, { dueDate: new Date(e.target.value).toISOString() })
                          }
                        />
                        {overdue && (
                          <div className="text-[11px] text-red-600 mt-0.5">Quá hạn {formatDate(t.dueDate)}</div>
                        )}
                      </td>

                      {/* Tồn đọng */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${stale ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                          title={`Tạo lúc ${formatDate(t.createdAt)}`}
                        >
                          <CalendarClock size={12} /> {timeFromNow(t.createdAt)}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onStart(t)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            title="Bắt đầu làm (chuyển sang Đang làm)"
                          >
                            <Play size={12} /> Bắt đầu
                          </button>
                          {isLead && (
                            <button
                              onClick={() => onDelete(t)}
                              className="text-xs py-1 px-2 rounded bg-red-50 hover:bg-red-100 text-red-600"
                              title="Xoá"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Thêm task tồn đọng (chưa gán) */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm task tồn đọng"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Huỷ
            </button>
            <button className="btn-primary" onClick={onSubmit}>
              Tạo task
            </button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Tiêu đề</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm((f) => {
                  const title = e.target.value
                  return {
                    ...f,
                    title,
                    link: isAutoJiraLink(f.link) ? deriveJiraLink(title) : f.link,
                  }
                })
              }
              placeholder="VD: HNCW-348 [Vận hành] Tích hợp API thanh toán"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Mô tả</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <LinkIcon size={11} /> Link Jira / task tracker (tuỳ chọn)
            </label>
            <input
              className="input"
              type="url"
              placeholder="https://issue.fastlink.vn/browse/HNCW-348"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dự án</label>
              <ProjectCombobox
                value={form.projectId}
                onChange={(id) => setForm((f) => ({ ...f, projectId: id }))}
              />
            </div>
            <div>
              <label className="label">Ưu tiên</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Hạn hoàn thành (tuỳ chọn)</label>
              <input
                type="date"
                className="input"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-500">
            Task sẽ ở trạng thái <b>Chưa làm</b> và <b>chưa gán cho ai</b> — nằm trong danh sách tồn đọng cho tới khi bạn gán người.
          </div>
        </form>
      </Modal>
    </div>
  )
}

const TONE_CLASS = {
  brand: 'bg-brand-50 text-brand-700',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-gray-50 text-gray-500',
}

function StatCard({ icon: Icon, tone, label, value }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TONE_CLASS[tone] ?? TONE_CLASS.slate}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
      </div>
    </div>
  )
}
