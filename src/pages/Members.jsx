import { useState } from 'react'
import { Plus, Pencil, Trash2, Mail } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ROLES } from '../data/mockData.js'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'

const COLORS = ['#3a5ff5','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#14b8a6']

const emptyForm = { name: '', role: 'Frontend', email: '', color: COLORS[0] }

export default function Members() {
  const { members, tasks, addMember, updateMember, removeMember } = useApp()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (m) => {
    setEditing(m)
    setForm({ name: m.name, role: m.role, email: m.email, color: m.color })
    setModalOpen(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editing) {
      updateMember(editing.id, form)
    } else {
      addMember(form)
    }
    setModalOpen(false)
  }

  const onDelete = async (m) => {
    const ok = await confirm({
      title: 'Xoá thành viên',
      message: `Bạn có chắc muốn xoá "${m.name}"?\nCác task đang được gán cho thành viên này sẽ không có người làm.`,
      confirmLabel: 'Xoá',
      tone: 'danger',
    })
    if (ok) removeMember(m.id)
  }

  const countTasksOf = (id) =>
    tasks.filter((t) => t.assigneeId === id && t.status !== 'done').length

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm thành viên
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div key={m.id} className="card p-5">
            <div className="flex items-start gap-3">
              <Avatar member={m} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">{m.name}</div>
                <div className="text-xs text-gray-500">{m.role}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Mail size={12} />
                  <span className="truncate">{m.email}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  onClick={() => openEdit(m)}
                  title="Sửa"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="p-1.5 rounded hover:bg-red-50 text-red-500"
                  onClick={() => onDelete(m)}
                  title="Xoá"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">Task đang làm</span>
              <span className="font-semibold text-gray-800">{countTasksOf(m.id)}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa thành viên' : 'Thêm thành viên'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Huỷ
            </button>
            <button className="btn-primary" onClick={onSubmit}>
              {editing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Họ tên</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Nguyễn Văn A"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vai trò</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@hncjsc.vn"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="label">Màu avatar</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 ${
                    form.color === c ? 'border-gray-800' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
