import { useState } from 'react'
import { Plus, Pencil, Trash2, Mail, KeyRound, ShieldCheck, User } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ROLES } from '../data/mockData.js'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'

const COLORS = ['#3a5ff5','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#14b8a6']

const emptyForm = { name: '', role: 'Frontend', email: '', color: COLORS[0] }
const emptyCreds = { email: '', password: '', accountRole: 'Staff' }

export default function Members() {
  const { members, tasks, addMember, updateMember, removeMember, setMemberCredentials } = useApp()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [credsTarget, setCredsTarget] = useState(null) // member object
  const [creds, setCreds] = useState(emptyCreds)
  const [credsError, setCredsError] = useState(null)

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

  const openCreds = (m) => {
    setCredsTarget(m)
    setCreds({
      email: m.email ?? '',
      password: '',
      accountRole: m.accountRole || 'Staff',
    })
    setCredsError(null)
  }

  const submitCreds = async (e) => {
    e?.preventDefault?.()
    if (!credsTarget) return
    setCredsError(null)
    const payload = {}
    if (creds.email.trim() && creds.email.trim() !== (credsTarget.email ?? ''))
      payload.email = creds.email.trim()
    if (creds.password.trim()) payload.password = creds.password.trim()
    if (creds.accountRole !== credsTarget.accountRole) payload.accountRole = creds.accountRole
    if (Object.keys(payload).length === 0) {
      setCredsError('Chưa có thay đổi nào.')
      return
    }
    try {
      await setMemberCredentials(credsTarget.id, payload)
      setCredsTarget(null)
    } catch (err) {
      setCredsError(err.message || 'Lưu thất bại.')
    }
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
        {members.map((m) => {
          const isLead = m.accountRole === 'Lead'
          return (
            <div key={m.id} className="card p-5">
              <div className="flex items-start gap-3">
                <Avatar member={m} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 flex items-center gap-2">
                    {m.name}
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                        isLead
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      title={isLead ? 'Tài khoản Lead — xem tất cả' : 'Tài khoản Staff — chỉ xem của mình'}
                    >
                      {isLead ? <ShieldCheck size={10} /> : <User size={10} />}
                      {isLead ? 'Lead' : 'Staff'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{m.role}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Mail size={12} />
                    <span className="truncate">{m.email || '— chưa có email —'}</span>
                  </div>
                  {!m.hasPassword && (
                    <div className="text-[11px] text-amber-700 mt-1">
                      Chưa cấp tài khoản đăng nhập
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    onClick={() => openEdit(m)}
                    title="Sửa thông tin"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-brand-50 text-brand-600"
                    onClick={() => openCreds(m)}
                    title="Cấp / đổi tài khoản"
                  >
                    <KeyRound size={14} />
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
          )
        })}
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
          {!editing && (
            <div className="text-[11px] text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Sau khi tạo, bấm nút <KeyRound size={11} className="inline" /> để cấp email + mật khẩu đăng nhập cho thành viên.
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={!!credsTarget}
        onClose={() => setCredsTarget(null)}
        title={`Cấp tài khoản — ${credsTarget?.name ?? ''}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCredsTarget(null)}>
              Huỷ
            </button>
            <button className="btn-primary" onClick={submitCreds}>
              Lưu
            </button>
          </>
        }
      >
        <form onSubmit={submitCreds} className="space-y-3">
          <div>
            <label className="label">Email đăng nhập</label>
            <input
              className="input"
              type="email"
              value={creds.email}
              onChange={(e) => setCreds((c) => ({ ...c, email: e.target.value }))}
              placeholder="email@hncjsc.vn"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Mật khẩu mới</label>
            <input
              className="input"
              type="password"
              value={creds.password}
              onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
              placeholder={credsTarget?.hasPassword ? 'Để trống = giữ pw cũ' : 'Tối thiểu 4 ký tự'}
            />
            {credsTarget?.hasPassword && (
              <div className="text-[11px] text-gray-500 mt-1">
                Để trống nếu chỉ đổi quyền/email, không đổi pw.
              </div>
            )}
          </div>
          <div>
            <label className="label">Loại tài khoản</label>
            <div className="flex gap-2">
              {['Staff', 'Lead'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setCreds((c) => ({ ...c, accountRole: r }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors inline-flex items-center justify-center gap-1 ${
                    creds.accountRole === r
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r === 'Lead' ? <ShieldCheck size={13} /> : <User size={13} />}
                  {r === 'Lead' ? 'Lead (xem tất cả)' : 'Staff (chỉ của mình)'}
                </button>
              ))}
            </div>
          </div>
          {credsError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {credsError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
