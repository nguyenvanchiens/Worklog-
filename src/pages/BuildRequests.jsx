import { useMemo, useState } from 'react'
import { Plus, Play, Check, X, Trash2, Rocket, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  BUILD_ENV_LABEL,
  BUILD_STATUS_LABEL,
} from '../data/mockData.js'
import Badge from '../components/common/Badge.jsx'
import Avatar from '../components/common/Avatar.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'
import ProjectCombobox from '../components/common/ProjectCombobox.jsx'
import { formatDateTime, timeFromNow } from '../utils/format.js'

const ENV_OPTIONS = ['dev', 'production']

const emptyForm = { projectId: '', env: 'dev', note: '' }

export default function BuildRequests() {
  const {
    buildRequests,
    projects,
    currentUserId,
    addBuildRequest,
    updateBuildRequest,
    removeBuildRequest,
    isBuildPending,
    getMember,
    getProject,
  } = useApp()
  const { user, isLead } = useAuth()

  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [envFilter, setEnvFilter] = useState('')
  const [versionModal, setVersionModal] = useState(null) // build object
  const [versionInput, setVersionInput] = useState('')

  const active = useMemo(
    () =>
      buildRequests
        .filter((b) => b.status === 'pending' || b.status === 'building')
        .filter((b) => !envFilter || b.env === envFilter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [buildRequests, envFilter],
  )

  const openAdd = () => {
    setForm({ projectId: projects[0]?.id ?? '', env: 'dev', note: '' })
    setModalOpen(true)
  }

  const [submitRequest, setSubmitRequest] = useState(false)
  const [submitVersionState, setSubmitVersionState] = useState(false)

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    if (!form.projectId || submitRequest) return
    setSubmitRequest(true)
    try {
      await addBuildRequest({
        projectId: form.projectId,
        env: form.env,
        note: form.note,
        requesterId: currentUserId,
      })
      setModalOpen(false)
    } catch { /* toast lỗi đã hiện */ }
    finally { setSubmitRequest(false) }
  }

  const startBuild = (b) => updateBuildRequest(b.id, { status: 'building' })

  const markSuccess = (b) => {
    setVersionInput('v1.0.0')
    setVersionModal(b)
  }

  const submitVersion = async () => {
    if (!versionModal || submitVersionState) return
    setSubmitVersionState(true)
    try {
      await updateBuildRequest(versionModal.id, {
        status: 'success',
        completedAt: new Date().toISOString(),
        version: versionInput.trim() || null,
      })
      setVersionModal(null)
    } catch { /* toast lỗi đã hiện */ }
    finally { setSubmitVersionState(false) }
  }

  const markFailed = async (b) => {
    const ok = await confirm({
      title: 'Đánh dấu build thất bại?',
      message: 'Build này sẽ được ghi vào Lịch sử Build với trạng thái THẤT BẠI.',
      confirmLabel: 'Đánh dấu thất bại',
      tone: 'danger',
    })
    if (!ok) return
    updateBuildRequest(b.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Lọc môi trường</label>
          <select
            className="input w-40"
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            {ENV_OPTIONS.map((env) => (
              <option key={env} value={env}>{BUILD_ENV_LABEL[env]}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Yêu cầu build mới
          </button>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Rocket size={40} className="mx-auto mb-3" />
          <div className="font-medium text-gray-600 mb-1">Không có build chờ xử lý</div>
          <div className="text-sm">
            {isLead
              ? 'Khi thành viên gửi yêu cầu, nó sẽ xuất hiện ở đây.'
              : 'Bạn chưa có build nào đang chờ.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map((b) => {
            const requester = getMember(b.requesterId)
            const project = getProject(b.projectId)
            // Quyền thao tác: Lead làm hết; staff được thao tác trên build của mình.
            const canAct = isLead || b.requesterId === currentUserId
            const pending = isBuildPending(b.id)
            return (
              <div
                key={b.id}
                className={`card p-5 relative transition-opacity ${
                  pending ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {pending && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs text-brand-600 font-medium bg-white/95 border border-brand-200 px-2 py-1 rounded-md shadow-sm">
                    <Loader2 size={12} className="animate-spin" /> Đang lưu...
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <Avatar member={requester} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {requester?.name}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        {timeFromNow(b.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      yêu cầu build <strong>{project?.name}</strong>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={b.env}>{BUILD_ENV_LABEL[b.env]}</Badge>
                    <Badge tone={b.status}>{BUILD_STATUS_LABEL[b.status]}</Badge>
                  </div>
                </div>

                {b.note && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {b.note}
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Tạo lúc: {formatDateTime(b.createdAt)}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {b.status === 'pending' && canAct && (
                    <button
                      onClick={() => startBuild(b)}
                      className="btn-primary"
                    >
                      <Play size={14} /> Bắt đầu build
                    </button>
                  )}
                  {b.status === 'building' && canAct && (
                    <>
                      <button
                        onClick={() => markSuccess(b)}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check size={14} /> Hoàn thành
                      </button>
                      <button
                        onClick={() => markFailed(b)}
                        className="btn-danger"
                      >
                        <X size={14} /> Thất bại
                      </button>
                    </>
                  )}
                  {/* Chỉ Lead mới được xoá yêu cầu */}
                  {isLead && (
                    <button
                      onClick={() => removeBuildRequest(b.id)}
                      className="btn-secondary ml-auto"
                      title="Xoá yêu cầu"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={submitRequest ? undefined : () => setModalOpen(false)}
        title="Yêu cầu build mới"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitRequest}>
              Huỷ
            </button>
            <button className="btn-primary" onClick={onSubmit} disabled={submitRequest}>
              {submitRequest ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Đang gửi...
                </span>
              ) : 'Gửi yêu cầu'}
            </button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Dự án</label>
            <ProjectCombobox
              value={form.projectId}
              onChange={(id) => setForm((f) => ({ ...f, projectId: id }))}
            />
          </div>
          <div>
            <label className="label">Môi trường</label>
            <div className="flex gap-2">
              {ENV_OPTIONS.map((env) => (
                <button
                  type="button"
                  key={env}
                  onClick={() => setForm((f) => ({ ...f, env }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.env === env
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {BUILD_ENV_LABEL[env]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Ghi chú (tính năng, bug fix, lý do build...)</label>
            <textarea
              className="input"
              rows={4}
              placeholder="VD: Cần build dev để QA test luồng thanh toán mới."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="text-xs text-gray-500">
            Yêu cầu sẽ được gửi với tên: <strong>{user?.name}</strong>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!versionModal}
        onClose={submitVersionState ? undefined : () => setVersionModal(null)}
        title="Đánh dấu build thành công"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setVersionModal(null)} disabled={submitVersionState}>
              Huỷ
            </button>
            <button
              className="btn-primary bg-emerald-600 hover:bg-emerald-700"
              onClick={submitVersion}
              disabled={submitVersionState}
            >
              {submitVersionState ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Đang xác nhận...
                </span>
              ) : (
                <><Check size={14} /> Xác nhận</>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Nhập phiên bản đã build cho yêu cầu này (sẽ lưu vào Lịch sử Build).
          </div>
          <div>
            <label className="label">Phiên bản</label>
            <input
              className="input"
              placeholder="VD: v1.4.3"
              value={versionInput}
              onChange={(e) => setVersionInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitVersion()}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
