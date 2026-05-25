import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, API_BASE } from '../api/client.js'
import { useAuth } from './AuthContext.jsx'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user } = useAuth()

  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [buildRequests, setBuildRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [initialError, setInitialError] = useState(null)
  const [error, setError] = useState(null)

  // currentUserId = user đang đăng nhập (lấy từ JWT). Không còn tự chọn nữa.
  const currentUserId = user?.id ?? null

  // Wrap mỗi API call để xử lý error nhất quán
  const handleApi = useCallback(async (operation) => {
    try {
      return await operation()
    } catch (e) {
      console.error('[API]', e)
      const msg = e.message || String(e)
      setError(msg)
      setTimeout(
        () => setError((cur) => (cur === msg ? null : cur)),
        5000,
      )
      throw e
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setInitialError(null)
    try {
      const [m, p, t, b] = await Promise.all([
        api.get('/members'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/builds'),
      ])
      setMembers(m)
      setProjects(p)
      setTasks(t)
      setBuildRequests(b)
    } catch (e) {
      console.error('[INIT]', e)
      setInitialError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // ===== Members =====
  const addMember = (m) =>
    handleApi(async () => {
      const created = await api.post('/members', m)
      setMembers((list) => [...list, created])
      return created
    })

  const updateMember = (id, patch) =>
    handleApi(async () => {
      const updated = await api.put(`/members/${id}`, patch)
      setMembers((list) => list.map((m) => (m.id === id ? updated : m)))
      return updated
    })

  const removeMember = (id) =>
    handleApi(async () => {
      await api.del(`/members/${id}`)
      setMembers((list) => list.filter((m) => m.id !== id))
    })

  const setMemberCredentials = (id, payload) =>
    handleApi(async () => {
      const updated = await api.put(`/members/${id}/credentials`, payload)
      setMembers((list) => list.map((m) => (m.id === id ? updated : m)))
      return updated
    })

  // ===== Projects =====
  const addProject = (p) =>
    handleApi(async () => {
      const created = await api.post('/projects', p)
      setProjects((list) => [...list, created])
      return created
    })

  const removeProject = (id) =>
    handleApi(async () => {
      await api.del(`/projects/${id}`)
      setProjects((list) => list.filter((p) => p.id !== id))
    })

  // ===== Tasks =====
  const addTask = (t) =>
    handleApi(async () => {
      const created = await api.post('/tasks', t)
      setTasks((list) => [...list, created])
      return created
    })

  const updateTask = (id, patch) =>
    handleApi(async () => {
      const updated = await api.put(`/tasks/${id}`, patch)
      setTasks((list) => list.map((t) => (t.id === id ? updated : t)))
      return updated
    })

  /// Staff dùng — chỉ đổi status cho task của mình. BE check assignee.
  const updateTaskStatus = (id, status) =>
    handleApi(async () => {
      const updated = await api.put(`/tasks/${id}/status`, { status })
      setTasks((list) => list.map((t) => (t.id === id ? updated : t)))
      return updated
    })

  const removeTask = (id) =>
    handleApi(async () => {
      await api.del(`/tasks/${id}`)
      setTasks((list) => list.filter((t) => t.id !== id))
    })

  const requestTaskBuild = (taskId, { env, note }) =>
    handleApi(async () => {
      const updated = await api.post(`/tasks/${taskId}/request-build`, { env, note })
      setTasks((list) => list.map((t) => (t.id === taskId ? updated : t)))
      return updated
    })

  const cancelTaskBuild = (taskId) =>
    handleApi(async () => {
      const updated = await api.post(`/tasks/${taskId}/cancel-build`, {})
      setTasks((list) => list.map((t) => (t.id === taskId ? updated : t)))
      return updated
    })

  const completeTaskBuild = (taskId, version) =>
    handleApi(async () => {
      const result = await api.post(`/tasks/${taskId}/complete-build`, { version })
      setTasks((list) => list.map((t) => (t.id === taskId ? result.task : t)))
      setBuildRequests((list) => [...list, result.build])
      return result
    })

  // ===== Build Requests =====
  const addBuildRequest = (b) =>
    handleApi(async () => {
      const created = await api.post('/builds', {
        projectId: b.projectId,
        requesterId: b.requesterId,
        env: b.env,
        note: b.note,
      })
      setBuildRequests((list) => [...list, created])
      return created
    })

  const updateBuildRequest = (id, patch) =>
    handleApi(async () => {
      // BE chỉ chấp nhận { status, version? } qua endpoint /status
      const updated = await api.put(`/builds/${id}/status`, {
        status: patch.status,
        version: patch.version ?? null,
      })
      setBuildRequests((list) => list.map((b) => (b.id === id ? updated : b)))
      return updated
    })

  const removeBuildRequest = (id) =>
    handleApi(async () => {
      await api.del(`/builds/${id}`)
      setBuildRequests((list) => list.filter((b) => b.id !== id))
    })

  // Reset = re-fetch from server (không xoá DB)
  const resetDemoData = refreshAll

  const value = {
    // data
    members, projects, tasks, buildRequests,
    currentUserId,
    // status
    loading, error, initialError,
    // actions
    addMember, updateMember, removeMember, setMemberCredentials,
    addProject, removeProject,
    addTask, updateTask, updateTaskStatus, removeTask,
    requestTaskBuild, cancelTaskBuild, completeTaskBuild,
    addBuildRequest, updateBuildRequest, removeBuildRequest,
    resetDemoData, refreshAll,
    // helpers
    getMember: (id) => members.find((m) => m.id === id),
    getProject: (id) => projects.find((p) => p.id === id),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <div className="text-sm text-gray-500">Đang tải dữ liệu từ server...</div>
        <div className="text-xs text-gray-400 font-mono">{API_BASE}</div>
      </div>
    )
  }

  if (initialError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 px-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl">
          !
        </div>
        <div className="text-base font-semibold text-gray-800">
          Không kết nối được tới server
        </div>
        <div className="text-sm text-gray-500 text-center max-w-md whitespace-pre-line">
          {initialError}
        </div>
        <div className="text-xs text-gray-400 font-mono">{API_BASE}</div>
        <button onClick={refreshAll} className="btn-primary mt-2">
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md card border-red-200 bg-red-50/95 p-3 flex items-start gap-3 shadow-lg animate-in">
          <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold shrink-0">
            !
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-red-700 mb-0.5">Lỗi</div>
            <div className="text-sm text-red-700 break-words">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
