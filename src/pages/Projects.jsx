import { useState } from 'react'
import { Plus, Trash2, Boxes } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'

const emptyForm = { name: '', code: '' }

export default function Projects() {
  const { projects, tasks, buildRequests, addProject, removeProject } = useApp()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) return
    addProject({ name: form.name.trim(), code: form.code.trim().toUpperCase() })
    setModalOpen(false)
  }

  const onDelete = async (p) => {
    const ok = await confirm({
      title: 'Xoá dự án',
      message: `Bạn có chắc muốn xoá dự án "${p.name}"?\nCác task và build liên quan sẽ vẫn còn nhưng mất tên dự án.`,
      confirmLabel: 'Xoá dự án',
      tone: 'danger',
    })
    if (ok) removeProject(p.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Thêm dự án
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const taskCount = tasks.filter((t) => t.projectId === p.id).length
          const buildCount = buildRequests.filter((b) => b.projectId === p.id).length
          return (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                    {p.code}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-500">Mã: {p.code}</div>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(p)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Task</div>
                  <div className="font-semibold text-gray-800">{taskCount}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Build</div>
                  <div className="font-semibold text-gray-800">{buildCount}</div>
                </div>
              </div>
            </div>
          )
        })}
        {projects.length === 0 && (
          <div className="col-span-full card p-12 text-center text-gray-400">
            <Boxes size={40} className="mx-auto mb-3" />
            <div className="text-sm">Chưa có dự án nào.</div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm dự án mới"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Huỷ
            </button>
            <button className="btn-primary" onClick={onSubmit}>
              Thêm dự án
            </button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Tên dự án</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Hệ thống CRM"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Mã viết tắt (tối đa 5 ký tự)</label>
            <input
              className="input uppercase"
              maxLength={5}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="VD: CRM"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
