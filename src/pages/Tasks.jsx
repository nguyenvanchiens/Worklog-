import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Filter, Timer, ExternalLink, Link as LinkIcon, CalendarClock } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  TASK_STATUS_LABEL,
  PRIORITY_LABEL,
  UNASSIGNED_ID,
} from '../data/mockData.js'
import Badge from '../components/common/Badge.jsx'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'
import ProjectCombobox from '../components/common/ProjectCombobox.jsx'
import {
  formatDate,
  isOverdue,
  elapsedFrom,
  taskStateSince,
  formatDateTime,
  timeFromNow,
  deriveJiraLink,
  isAutoJiraLink,
} from '../utils/format.js'

const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'waiting_build', 'testing', 'done']
// Status staff được tự chuyển (không tự đẩy thẳng vào waiting_build — phải qua "Yêu cầu build")
const STAFF_STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'testing', 'done']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']

const emptyForm = {
  title: '',
  description: '',
  link: '',
  assigneeId: '',
  projectId: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
}

export default function Tasks() {
  const {
    tasks,
    members,
    projects,
    addTask,
    updateTask,
    updateTaskStatus,
    removeTask,
    getMember,
    getProject,
  } = useApp()
  const { isLead, isStaff } = useAuth()

  const confirm = useConfirm()
  const [filter, setFilter] = useState({ assigneeId: '', status: '', projectId: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter.assigneeId && t.assigneeId !== filter.assigneeId) return false
      if (filter.status && t.status !== filter.status) return false
      if (filter.projectId && t.projectId !== filter.projectId) return false
      return true
    })
  }, [tasks, filter])

  const grouped = useMemo(() => {
    const map = { todo: [], in_progress: [], review: [], waiting_build: [], testing: [], done: [] }
    filtered.forEach((t) => map[t.status]?.push(t))
    return map
  }, [filtered])

  const openAdd = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      assigneeId: members[0]?.id ?? UNASSIGNED_ID,
      projectId: projects[0]?.id ?? '',
    })
    setModalOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      title: t.title,
      description: t.description,
      link: t.link ?? '',
      assigneeId: t.assigneeId || UNASSIGNED_ID,
      projectId: t.projectId,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
    })
    setModalOpen(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = {
      ...form,
      link: form.link?.trim() || null,
      assigneeId: form.assigneeId || UNASSIGNED_ID,   // '' → coi như chưa gán
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    }
    if (editing) updateTask(editing.id, payload)
    else addTask(payload)
    setModalOpen(false)
  }

  const onDelete = async (t) => {
    const ok = await confirm({
      title: 'Xoá task',
      message: `Bạn có chắc muốn xoá task "${t.title}"?`,
      confirmLabel: 'Xoá',
      tone: 'danger',
    })
    if (ok) removeTask(t.id)
  }

  const onStaffChangeStatus = (t, newStatus) => {
    if (newStatus === t.status) return
    updateTaskStatus(t.id, newStatus)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={16} /> Lọc:
        </div>
        {/* Staff chỉ xem task của mình → ẩn filter thành viên */}
        {isLead && (
          <div>
            <label className="label">Thành viên</label>
            <select
              className="input w-44"
              value={filter.assigneeId}
              onChange={(e) => setFilter((f) => ({ ...f, assigneeId: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Trạng thái</label>
          <select
            className="input w-40"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
            ))}
          </select>
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
        {isLead && (
          <div className="ml-auto">
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={16} /> Thêm task
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="card p-3 flex flex-col">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-2">
                <Badge tone={status}>{TASK_STATUS_LABEL[status]}</Badge>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {grouped[status].length}
              </span>
            </div>
            <div className="space-y-2 flex-1">
              {grouped[status].length === 0 && (
                <div className="text-center text-xs text-gray-400 py-6">
                  Không có task
                </div>
              )}
              {grouped[status].map((t) => {
                const member = getMember(t.assigneeId)
                const project = getProject(t.projectId)
                const overdue = status !== 'done' && isOverdue(t.dueDate)
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border bg-white transition-colors ${
                      overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {t.link ? (
                        <a
                          href={t.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-gray-800 hover:text-brand-700 hover:underline flex-1 inline-flex items-start gap-1"
                          title={`Mở: ${t.link}`}
                        >
                          <span className="flex-1">{t.title}</span>
                          <ExternalLink size={11} className="opacity-60 mt-1 shrink-0" />
                        </a>
                      ) : (
                        <div className="font-medium text-sm text-gray-800 flex-1">
                          {t.title}
                        </div>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap">
                      <Badge tone={t.priority}>{PRIORITY_LABEL[t.priority]}</Badge>
                      {project && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {project.code}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 text-gray-500"
                        title={`Vào trạng thái này từ: ${formatDateTime(taskStateSince(t))}`}
                      >
                        <Timer size={10} /> {elapsedFrom(taskStateSince(t))}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 text-gray-400"
                        title={`Tạo lúc: ${formatDateTime(t.createdAt)}`}
                      >
                        <CalendarClock size={10} /> tạo {timeFromNow(t.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar member={member} size={24} />
                        <span className="text-xs text-gray-600 truncate">
                          {member?.name}
                        </span>
                      </div>
                      {t.dueDate && (
                        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {formatDate(t.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Action row: lead có Sửa/Xoá; staff có dropdown đổi status */}
                    {isLead ? (
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="flex-1 text-xs py-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 inline-flex items-center justify-center gap-1"
                        >
                          <Pencil size={11} /> Sửa
                        </button>
                        <button
                          onClick={() => onDelete(t)}
                          className="text-xs py-1 px-2 rounded bg-red-50 hover:bg-red-100 text-red-600"
                          title="Xoá"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ) : (
                      // Staff: chỉ đổi status (không đẩy thẳng vào waiting_build).
                      // Nếu task đang waiting_build, hiển thị badge thay vì dropdown.
                      t.status === 'waiting_build' ? (
                        <div className="mt-2 text-[11px] text-gray-500 italic">
                          Đang chờ Lead duyệt build — không đổi được status.
                        </div>
                      ) : (
                        <div className="mt-2">
                          <select
                            className="input w-full text-xs h-8 py-0"
                            value={t.status}
                            onChange={(e) => onStaffChangeStatus(t, e.target.value)}
                          >
                            {STAFF_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {isLead && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Sửa task' : 'Thêm task mới'}
          size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                Huỷ
              </button>
              <button className="btn-primary" onClick={onSubmit}>
                {editing ? 'Cập nhật' : 'Tạo task'}
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
              <div className="text-[11px] text-gray-500 mt-1">
                Tự sinh khi tiêu đề có mã ticket (HNCW-348, SMT-35...). Bạn có thể sửa lại nếu cần.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Người làm</label>
                <select
                  className="input"
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                >
                  <option value={UNASSIGNED_ID}>— Chưa gán (tồn đọng) —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Dự án</label>
                <ProjectCombobox
                  value={form.projectId}
                  onChange={(id) => setForm((f) => ({ ...f, projectId: id }))}
                />
              </div>
              <div>
                <label className="label">Trạng thái</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                  ))}
                </select>
                {editing?.startedAt && form.status === 'todo' && (
                  <div className="text-[11px] text-amber-700 mt-1">
                    Task đã bắt đầu (Đang làm) — chỉ Lead mới chuyển về "Chưa làm" được.
                  </div>
                )}
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
                <label className="label">Hạn hoàn thành</label>
                <input
                  type="date"
                  className="input"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
