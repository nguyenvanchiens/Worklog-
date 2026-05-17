import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BUILD_ENV_LABEL,
  BUILD_STATUS_LABEL,
} from '../data/mockData.js'
import Badge from '../components/common/Badge.jsx'
import Avatar from '../components/common/Avatar.jsx'
import { formatDateTime } from '../utils/format.js'

const ENV_OPTIONS = ['dev', 'production']
const STATUS_OPTIONS = ['success', 'failed']

export default function BuildHistory() {
  const { buildRequests, getMember, getProject } = useApp()
  const [envFilter, setEnvFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const history = useMemo(() => {
    return buildRequests
      .filter((b) => b.status === 'success' || b.status === 'failed')
      .filter((b) => !envFilter || b.env === envFilter)
      .filter((b) => !statusFilter || b.status === statusFilter)
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
  }, [buildRequests, envFilter, statusFilter])

  const stats = useMemo(() => {
    const success = buildRequests.filter((b) => b.status === 'success').length
    const failed = buildRequests.filter((b) => b.status === 'failed').length
    return { success, failed, total: success + failed }
  }, [buildRequests])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-gray-500">Tổng build đã chạy</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500">Thành công</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.success}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500">Thất bại</div>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Môi trường</label>
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
        <div>
          <label className="label">Kết quả</label>
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{BUILD_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {history.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Chưa có lịch sử build phù hợp bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Người yêu cầu</th>
                  <th className="px-4 py-3 font-medium">Dự án</th>
                  <th className="px-4 py-3 font-medium">Môi trường</th>
                  <th className="px-4 py-3 font-medium">Kết quả</th>
                  <th className="px-4 py-3 font-medium">Phiên bản</th>
                  <th className="px-4 py-3 font-medium">Yêu cầu lúc</th>
                  <th className="px-4 py-3 font-medium">Hoàn thành lúc</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => {
                  const requester = getMember(b.requesterId)
                  const project = getProject(b.projectId)
                  return (
                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar member={requester} size={28} />
                          <span>{requester?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{project?.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={b.env}>{BUILD_ENV_LABEL[b.env]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={b.status}>{BUILD_STATUS_LABEL[b.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {b.version || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(b.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(b.completedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
