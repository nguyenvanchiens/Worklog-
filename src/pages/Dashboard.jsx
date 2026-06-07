import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Rocket,
  Clock,
  CheckCircle2,
  Activity,
  CircleDot,
  Coffee,
  Flame,
  ListChecks,
  PackageCheck,
  Hourglass,
  Users,
  Plus,
  Check,
  Undo2,
  Timer,
  Trophy,
  ChevronDown,
  ExternalLink,
  Link as LinkIcon,
  Trash2,
  CalendarClock,
  Pencil,
  Filter,
  Loader2,
  Download,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { downloadFile } from '../api/client.js'
import Avatar from '../components/common/Avatar.jsx'
import Badge from '../components/common/Badge.jsx'
import Tabs from '../components/common/Tabs.jsx'
import Modal from '../components/common/Modal.jsx'
import { useConfirm } from '../components/common/ConfirmProvider.jsx'
import ProjectCombobox from '../components/common/ProjectCombobox.jsx'
import {
  TASK_STATUS_LABEL,
  PRIORITY_LABEL,
  BUILD_ENV_LABEL,
  BUILD_STATUS_LABEL,
} from '../data/mockData.js'
import {
  formatDate,
  formatDateTime,
  isOverdue,
  timeFromNow,
  formatDuration,
  durationMs,
  elapsedFrom,
  taskStateSince,
  deriveJiraLink,
  isAutoJiraLink,
} from '../utils/format.js'

const TAB_STORAGE_KEY = 'tm_dashboard_tab'

export default function Dashboard() {
  const { members, projects, tasks, buildRequests, currentUserId, getMember, getProject } = useApp()
  const { isStaff, isLead } = useAuth()

  // Staff: chỉ xem dữ liệu của mình → giới hạn danh sách member trên Dashboard.
  const visibleMembers = isStaff
    ? members.filter((m) => m.id === currentUserId)
    : members

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(TAB_STORAGE_KEY) || 'actions'
  })
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  // ============== EXPORT EXCEL TUẦN ==============
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await downloadFile(`/export/weekly?date=${exportDate}`, 'BaoCaoTuan.xlsx')
    } catch (e) {
      setExportError(e.message || 'Xuất Excel thất bại')
    } finally {
      setExporting(false)
    }
  }

  // ============== ACTION REQUIRED ==============
  const actions = useMemo(() => {
    const items = []
    // Build request độc lập (từ trang /builds)
    buildRequests
      .filter((b) => b.status === 'pending' || b.status === 'building')
      .forEach((b) =>
        items.push({
          id: `b-${b.id}`,
          kind: 'build',
          urgency: b.env === 'production' ? 2 : 1,
          createdAt: b.createdAt,
          data: b,
        }),
      )
    // Task đang ở trạng thái chờ build (staff bấm "Chờ build" trên task của mình)
    tasks
      .filter((t) => t.status === 'waiting_build')
      .forEach((t) =>
        items.push({
          id: `tb-${t.id}`,
          kind: 'task_build',
          // Production = cao hơn dev, urgent priority bump thêm 1
          urgency:
            (t.buildEnv === 'production' ? 2 : 1) +
            (t.priority === 'urgent' ? 1 : 0),
          createdAt: t.buildRequestedAt || t.statusChangedAt || t.createdAt,
          data: t,
        }),
      )
    // Task quá hạn
    tasks
      .filter((t) => t.status !== 'done' && isOverdue(t.dueDate))
      .forEach((t) =>
        items.push({
          id: `t-${t.id}`,
          kind: 'overdue',
          urgency: t.priority === 'urgent' ? 3 : t.priority === 'high' ? 2 : 1,
          createdAt: t.dueDate,
          data: t,
        }),
      )
    return items.sort((a, b) => b.urgency - a.urgency)
  }, [buildRequests, tasks])

  // ============== TEAM STATUS ==============
  const teamStatus = useMemo(() => {
    return visibleMembers.map((m) => {
      const myTasks = tasks.filter(
        (t) => t.assigneeId === m.id && t.status !== 'done',
      )
      const inProgress = myTasks.filter((t) => t.status === 'in_progress')
      const review = myTasks.filter((t) => t.status === 'review')
      const todo = myTasks.filter((t) => t.status === 'todo')
      const waitingBuild = myTasks.filter((t) => t.status === 'waiting_build')
      const testing = myTasks.filter((t) => t.status === 'testing')
      const overdue = myTasks.filter((t) => isOverdue(t.dueDate))
      const myBuilds = buildRequests.filter(
        (b) =>
          b.requesterId === m.id &&
          (b.status === 'pending' || b.status === 'building'),
      )

      let state = 'free'
      if (inProgress.length) state = 'working'
      else if (waitingBuild.length) state = 'waiting_build'
      else if (testing.length) state = 'testing'
      else if (review.length) state = 'review'
      else if (todo.length) state = 'idle'

      return {
        member: m,
        activeTasks: [...inProgress, ...waitingBuild, ...testing, ...review, ...todo],
        counts: {
          inProgress: inProgress.length,
          waitingBuild: waitingBuild.length,
          testing: testing.length,
          review: review.length,
          todo: todo.length,
          overdue: overdue.length,
        },
        myBuilds,
        state,
      }
    })
  }, [visibleMembers, tasks, buildRequests])

  // ============== PROJECT HEALTH ==============
  const projectHealth = useMemo(() => {
    return projects.map((p) => {
      const pTasks = tasks.filter((t) => t.projectId === p.id)
      const done = pTasks.filter((t) => t.status === 'done').length
      const active = pTasks.filter((t) => t.status !== 'done').length
      const overdue = pTasks.filter(
        (t) => t.status !== 'done' && isOverdue(t.dueDate),
      ).length
      const pendingBuilds = buildRequests.filter(
        (b) =>
          b.projectId === p.id &&
          (b.status === 'pending' || b.status === 'building'),
      )
      const total = pTasks.length || 1
      return {
        project: p,
        total: pTasks.length,
        done,
        active,
        overdue,
        pendingBuilds,
        progress: Math.round((done / total) * 100),
      }
    })
  }, [projects, tasks, buildRequests])

  // ============== RECENT ACTIVITY ==============
  const recentActivity = useMemo(() => {
    const events = []
    buildRequests.forEach((b) => {
      events.push({
        id: `b-${b.id}`,
        ts: b.createdAt,
        kind: 'build_request',
        data: b,
      })
      if (b.completedAt)
        events.push({
          id: `b-${b.id}-done`,
          ts: b.completedAt,
          kind: 'build_done',
          data: b,
        })
    })
    tasks.forEach((t) =>
      events.push({
        id: `t-${t.id}`,
        ts: t.createdAt,
        kind: 'task_created',
        data: t,
      }),
    )
    return events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 20)
  }, [tasks, buildRequests])

  // ============== STATS ==============
  const stats = {
    needAction: actions.length,
    activeMembers: teamStatus.filter((t) => t.state === 'working').length,
    totalActiveTasks: tasks.filter((t) => t.status !== 'done').length,
    doneToday: tasks.filter(
      (t) =>
        t.status === 'done' &&
        new Date(t.createdAt).toDateString() === new Date().toDateString(),
    ).length,
  }

  const overdueCount = tasks.filter(
    (t) => t.status !== 'done' && isOverdue(t.dueDate),
  ).length

  // Staff: chỉ xem 2 tab đầu — các tab phân tích tổng thể là Lead-only.
  const tabs = [
    {
      id: 'actions',
      label: 'Cần xử lý ngay',
      icon: Flame,
      badge: actions.length,
      badgeTone: 'rose',
    },
    {
      id: 'team',
      label: 'Team đang làm gì',
      icon: Users,
      badge: overdueCount,
      badgeTone: 'rose',
    },
    ...(isLead ? [
      { id: 'projects', label: 'Sức khoẻ dự án',     icon: CircleDot },
      { id: 'timing',   label: 'Thời gian hoàn thành', icon: Timer },
      { id: 'activity', label: 'Hoạt động gần đây',   icon: Clock },
    ] : []),
  ]
  // Nếu staff đang ở tab Lead-only (vd save tab cũ từ Lead session) → bật lại tab mặc định.
  const tabIds = tabs.map((t) => t.id).join(',')
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) setActiveTab('actions')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIds])

  return (
    <div className="space-y-5">
      {/* EXPORT EXCEL TUẦN — chỉ Lead */}
      {isLead && (
        <div className="card p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
            <Download size={16} className="text-emerald-600" />
            Báo cáo tuần
          </span>
          <span className="text-xs text-gray-500">Chọn 1 ngày trong tuần (T2–T6) cần xuất:</span>
          <input
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {exporting
              ? <Loader2 size={16} className="animate-spin" />
              : <Download size={16} />}
            Xuất Excel tuần
          </button>
          {exportError && (
            <span className="text-xs text-rose-600">{exportError}</span>
          )}
        </div>
      )}

      {/* TOP STATS — luôn hiện */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          icon={AlertTriangle}
          label="Cần xử lý ngay"
          value={stats.needAction}
          tone={stats.needAction > 0 ? 'rose' : 'slate'}
          onClick={() => setActiveTab('actions')}
        />
        <MiniStat
          icon={Activity}
          label="Đang hoạt động"
          value={`${stats.activeMembers}/${visibleMembers.length}`}
          tone="emerald"
          onClick={() => setActiveTab('team')}
        />
        <MiniStat
          icon={ListChecks}
          label="Task chưa xong"
          value={stats.totalActiveTasks}
          tone="brand"
          onClick={() => setActiveTab('team')}
        />
        <MiniStat
          icon={PackageCheck}
          label="Xong hôm nay"
          value={stats.doneToday}
          tone="amber"
          onClick={() => setActiveTab('activity')}
        />
      </div>

      {/* TABS */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* TAB CONTENT */}
      {activeTab === 'actions' && (
        <ActionsTab actions={actions} getMember={getMember} getProject={getProject} />
      )}
      {activeTab === 'team' && (
        <TeamTab teamStatus={teamStatus} getProject={getProject} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab projectHealth={projectHealth} getMember={getMember} />
      )}
      {activeTab === 'timing' && (
        <TimingTab
          members={members}
          tasks={tasks}
          getMember={getMember}
          getProject={getProject}
        />
      )}
      {activeTab === 'activity' && (
        <ActivityTab
          events={recentActivity}
          getMember={getMember}
          getProject={getProject}
        />
      )}
    </div>
  )
}

/* =========================================================
   TABS
   ========================================================= */

const ACTION_FILTER_STORAGE_KEY = 'tm_dashboard_action_filter'

function ActionsTab({ actions, getMember, getProject }) {
  // Phân nhóm — luôn tính trước, kể cả khi rỗng (để pill count đúng).
  const getEnv = (a) =>
    a.kind === 'build' ? a.data.env :
    a.kind === 'task_build' ? (a.data.buildEnv || 'dev') :
    null
  const prodBuilds = actions.filter((a) => a.kind !== 'overdue' && getEnv(a) === 'production')
  const devBuilds  = actions.filter((a) => a.kind !== 'overdue' && getEnv(a) === 'dev')
  const overdues   = actions.filter((a) => a.kind === 'overdue')

  const [filter, setFilter] = useState(
    () => localStorage.getItem(ACTION_FILTER_STORAGE_KEY) || 'all',
  )
  useEffect(() => {
    localStorage.setItem(ACTION_FILTER_STORAGE_KEY, filter)
  }, [filter])

  if (actions.length === 0) {
    return (
      <div className="card p-10 text-center bg-emerald-50/40 border-emerald-100">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
          <CheckCircle2 size={28} />
        </div>
        <div className="text-base font-semibold text-emerald-800">Tất cả đã ổn</div>
        <div className="text-sm text-emerald-700 mt-1">
          Không có build chờ xử lý và không có task quá hạn.
        </div>
      </div>
    )
  }

  const showProd = filter === 'all' || filter === 'prod'
  const showDev  = filter === 'all' || filter === 'dev'
  const showOver = filter === 'all' || filter === 'overdue'

  const groups = [
    { key: 'prod',    title: 'Build PRODUCTION', subtitle: 'Build lên môi trường production — ưu tiên cao nhất', icon: Rocket,         tone: 'rose',  count: prodBuilds.length, items: prodBuilds, show: showProd },
    { key: 'dev',     title: 'Build DEV',        subtitle: 'Build lên môi trường dev để team test',              icon: Rocket,         tone: 'blue',  count: devBuilds.length,  items: devBuilds,  show: showDev },
    { key: 'overdue', title: 'Task quá hạn',     subtitle: 'Task đã qua hạn nhưng chưa hoàn thành',              icon: AlertTriangle,  tone: 'amber', count: overdues.length,   items: overdues,   show: showOver },
  ]

  // Khi filter cụ thể -> chỉ giữ group đó. Khi all -> bỏ qua group rỗng.
  const visibleGroups = filter === 'all'
    ? groups.filter((g) => g.count > 0)
    : groups.filter((g) => g.show)

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 mr-1 inline-flex items-center gap-1">
          <Filter size={12} /> Lọc nhanh:
        </span>
        <ActionFilterPill
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          tone="slate"
          count={actions.length}
        >
          Tất cả
        </ActionFilterPill>
        <ActionFilterPill
          active={filter === 'prod'}
          onClick={() => setFilter('prod')}
          tone="rose"
          count={prodBuilds.length}
          disabled={prodBuilds.length === 0}
        >
          Build PRODUCTION
        </ActionFilterPill>
        <ActionFilterPill
          active={filter === 'dev'}
          onClick={() => setFilter('dev')}
          tone="blue"
          count={devBuilds.length}
          disabled={devBuilds.length === 0}
        >
          Build DEV
        </ActionFilterPill>
        <ActionFilterPill
          active={filter === 'overdue'}
          onClick={() => setFilter('overdue')}
          tone="amber"
          count={overdues.length}
          disabled={overdues.length === 0}
        >
          Task quá hạn
        </ActionFilterPill>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          Không có item nào trong nhóm này.
        </div>
      ) : (
        visibleGroups.map((g) => (
          <ActionGroup
            key={g.key}
            title={g.title}
            subtitle={g.subtitle}
            icon={g.icon}
            tone={g.tone}
            count={g.count}
            items={g.items}
            getMember={getMember}
            getProject={getProject}
          />
        ))
      )}
    </div>
  )
}

const PILL_TONES = {
  slate: { active: 'bg-gray-800 text-white',  inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200',     count: 'bg-white/20',          countInactive: 'bg-gray-200 text-gray-600' },
  rose:  { active: 'bg-rose-600 text-white',  inactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100',      count: 'bg-white/20',          countInactive: 'bg-rose-200 text-rose-700' },
  blue:  { active: 'bg-blue-600 text-white',  inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100',      count: 'bg-white/20',          countInactive: 'bg-blue-200 text-blue-700' },
  amber: { active: 'bg-amber-600 text-white', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100',   count: 'bg-white/20',          countInactive: 'bg-amber-200 text-amber-700' },
}

function ActionFilterPill({ active, onClick, tone, count, disabled, children }) {
  const t = PILL_TONES[tone] || PILL_TONES.slate
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        disabled
          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
          : active
            ? t.active
            : t.inactive
      }`}
    >
      {children}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
        disabled ? 'bg-gray-100 text-gray-300' : active ? t.count : t.countInactive
      }`}>
        {count}
      </span>
    </button>
  )
}

const GROUP_TONES = {
  rose:  { border: 'border-rose-200',  bg: 'from-rose-50/60',  iconBg: 'bg-rose-600',    divide: 'divide-rose-100/60',  badge: 'bg-rose-100 text-rose-700' },
  blue:  { border: 'border-blue-200',  bg: 'from-blue-50/60',  iconBg: 'bg-blue-600',    divide: 'divide-blue-100/60',  badge: 'bg-blue-100 text-blue-700' },
  amber: { border: 'border-amber-200', bg: 'from-amber-50/60', iconBg: 'bg-amber-600',   divide: 'divide-amber-100/60', badge: 'bg-amber-100 text-amber-700' },
}

function ActionGroup({ title, subtitle, icon: Icon, tone, count, items, getMember, getProject }) {
  const t = GROUP_TONES[tone] || GROUP_TONES.rose
  return (
    <div className={`card ${t.border} bg-gradient-to-br ${t.bg} to-white`}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${t.iconBg} text-white flex items-center justify-center`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-gray-800 text-sm">{title}</div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${t.badge}`}>
              {count}
            </span>
          </div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
      <div className={`divide-y ${t.divide}`}>
        {items.map((a) => (
          <ActionItem
            key={a.id}
            action={a}
            getMember={getMember}
            getProject={getProject}
          />
        ))}
      </div>
    </div>
  )
}

const TEAM_FILTER_OPTIONS = [
  { key: 'all',           label: 'Tất cả',     tone: 'slate'  },
  { key: 'in_progress',   label: 'Đang làm',   tone: 'blue'   },
  { key: 'waiting_build', label: 'Chờ build',  tone: 'orange' },
  { key: 'testing',       label: 'QA test',    tone: 'purple' },
  { key: 'review',        label: 'Đang review', tone: 'amber' },
  { key: 'todo',          label: 'Chưa làm',   tone: 'gray'   },
  { key: 'overdue',       label: 'Quá hạn',    tone: 'red'    },
]

function TeamTab({ teamStatus, getProject }) {
  const {
    members,
    projects,
    currentUserId,
    addTask,
    updateTask,
    updateTaskStatus,
    removeTask,
    requestTaskDeletion,
    approveTaskDeletion,
    cancelTaskDeletion,
    requestTaskBuild,
    cancelTaskBuild,
    completeTaskBuild,
  } = useApp()
  const { isLead, isStaff } = useAuth()
  // "Leader" cũ = role chuyên môn; quyền thao tác giờ dựa vào AccountRole (Lead/Staff).
  const isLeader = isLead
  const confirm = useConfirm()

  const [statusFilter, setStatusFilter] = useState('all')
  const [addTaskFor, setAddTaskFor] = useState(null) // member object
  const [editTaskFor, setEditTaskFor] = useState(null) // task object
  const [buildFor, setBuildFor] = useState(null)     // task object
  const [completeFor, setCompleteFor] = useState(null) // task object

  const filteredTeamStatus = useMemo(() => {
    if (statusFilter === 'all') return teamStatus
    return teamStatus
      .map((row) => {
        const tasks =
          statusFilter === 'overdue'
            ? row.activeTasks.filter((t) => isOverdue(t.dueDate))
            : row.activeTasks.filter((t) => t.status === statusFilter)
        return { ...row, activeTasks: tasks }
      })
      .filter((row) => row.activeTasks.length > 0)
  }, [teamStatus, statusFilter])

  const toggleStatus = (key) => {
    setStatusFilter((curr) => (curr === key ? 'all' : key))
  }

  const activeOpt = TEAM_FILTER_OPTIONS.find((o) => o.key === statusFilter)

  return (
    <>
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <div className="flex-1">
            <div className="font-semibold text-gray-800 text-sm">
              {statusFilter === 'all'
                ? `Trạng thái thời gian thực của ${teamStatus.length} thành viên`
                : `${filteredTeamStatus.length}/${teamStatus.length} thành viên có task "${activeOpt?.label}"`}
            </div>
            <div className="text-xs text-gray-500">
              Click "Chờ build" để gửi task lên leader · Leader tick "Đã build" để chuyển sang Lịch sử Build
            </div>
          </div>
          {isLead && (
            <Link to="/tasks" className="text-xs text-brand-600 font-medium hover:underline">
              Xem toàn bộ task →
            </Link>
          )}
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1 inline-flex items-center gap-1">
            <Filter size={12} /> Lọc trạng thái:
          </span>
          {TEAM_FILTER_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.key}
              active={statusFilter === opt.key}
              tone={opt.tone}
              onClick={() => setStatusFilter(opt.key)}
            >
              {opt.label}
            </FilterPill>
          ))}
        </div>

        <div className="divide-y divide-gray-100">
          {filteredTeamStatus.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Không có thành viên nào có task ở trạng thái "{activeOpt?.label}".
            </div>
          ) : (
            filteredTeamStatus.map((row) => (
              <MemberRow
                key={row.member.id}
                row={row}
                getProject={getProject}
                isLeader={isLeader}
                statusFilter={statusFilter}
                onToggleStatus={toggleStatus}
                onAddTask={() => setAddTaskFor(row.member)}
                onEditTask={(task) => setEditTaskFor(task)}
                onChangeStatus={(task, status) =>
                  isStaff
                    ? updateTaskStatus(task.id, status)
                    : updateTask(task.id, { status })
                }
                onRequestBuild={(task) => setBuildFor(task)}
                onCompleteBuild={(task) => setCompleteFor(task)}
                onCancelBuild={async (task) => {
                  const ok = await confirm({
                    title: 'Huỷ yêu cầu build?',
                    message: `Bạn có chắc muốn huỷ yêu cầu build cho "${task.title}"?\nTask sẽ trở về trạng thái trước đó.`,
                    confirmLabel: 'Huỷ yêu cầu build',
                    cancelLabel: 'Đóng',
                    tone: 'warning',
                  })
                  if (ok) cancelTaskBuild(task.id)
                }}
                onDelete={async (task) => {
                  const ok = await confirm({
                    title: 'Xoá task',
                    message: `Xoá task "${task.title}"?\nHành động này không thể hoàn tác.`,
                    confirmLabel: 'Xoá task',
                    tone: 'danger',
                  })
                  if (ok) removeTask(task.id)
                }}
                onRequestDeletion={async (task) => {
                  const ok = await confirm({
                    title: 'Xin xoá task',
                    message: `Gửi yêu cầu xoá task "${task.title}" lên Lead duyệt?\nTask sẽ ở trạng thái chờ duyệt cho đến khi Lead phản hồi.`,
                    confirmLabel: 'Gửi yêu cầu xoá',
                    tone: 'warning',
                  })
                  if (ok) requestTaskDeletion(task.id)
                }}
                onApproveDeletion={async (task) => {
                  const ok = await confirm({
                    title: 'Duyệt xoá task',
                    message: `Đồng ý xoá task "${task.title}"?\nThời gian làm task: vào trạng thái hiện tại ${elapsedFrom(taskStateSince(task))}.\nHành động này không thể hoàn tác.`,
                    confirmLabel: 'Duyệt + Xoá',
                    tone: 'danger',
                  })
                  if (ok) approveTaskDeletion(task.id)
                }}
                onCancelDeletion={async (task) => {
                  const ok = await confirm({
                    title: 'Huỷ yêu cầu xoá',
                    message: `Huỷ yêu cầu xoá task "${task.title}"? Task sẽ tiếp tục được dùng.`,
                    confirmLabel: 'Huỷ yêu cầu',
                    tone: 'warning',
                  })
                  if (ok) cancelTaskDeletion(task.id)
                }}
              />
            ))
          )}
        </div>
      </div>

      <AddTaskModal
        open={!!addTaskFor}
        member={addTaskFor}
        projects={projects}
        onClose={() => setAddTaskFor(null)}
        onSubmit={async (payload) => {
          try {
            await addTask(payload)
            setAddTaskFor(null)
          } catch { /* toast lỗi đã hiện */ }
        }}
      />

      <EditTaskModal
        open={!!editTaskFor}
        task={editTaskFor}
        onClose={() => setEditTaskFor(null)}
        onSubmit={async (patch) => {
          try {
            await updateTask(editTaskFor.id, patch)
            setEditTaskFor(null)
          } catch { /* toast lỗi đã hiện */ }
        }}
      />

      <RequestBuildModal
        open={!!buildFor}
        task={buildFor}
        getProject={getProject}
        onClose={() => setBuildFor(null)}
        onSubmit={async (env, note) => {
          try {
            await requestTaskBuild(buildFor.id, { env, note })
            setBuildFor(null)
          } catch { /* lỗi đã hiển thị qua toast */ }
        }}
      />

      <CompleteBuildModal
        open={!!completeFor}
        task={completeFor}
        onClose={() => setCompleteFor(null)}
        onSubmit={async (version) => {
          try {
            await completeTaskBuild(completeFor.id, version)
            setCompleteFor(null)
          } catch { /* lỗi đã hiển thị qua toast */ }
        }}
      />
    </>
  )
}

function ProjectsTab({ projectHealth, getMember }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projectHealth.map((p) => (
        <div key={p.project.id} className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              {p.project.code}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">{p.project.name}</div>
              <div className="text-xs text-gray-500">
                {p.total} task · {p.active} đang làm · {p.done} hoàn thành
              </div>
            </div>
            {p.pendingBuilds.length > 0 && (
              <Link
                to="/builds"
                className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 hover:bg-rose-100"
              >
                <Hourglass size={12} /> {p.pendingBuilds.length}
              </Link>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span>Tiến độ</span>
              <span className="font-semibold tabular-nums">{p.progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${p.progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Đang làm" value={p.active} />
            <Stat label="Hoàn thành" value={p.done} tone="emerald" />
            <Stat label="Quá hạn" value={p.overdue} tone={p.overdue > 0 ? 'rose' : 'gray'} />
          </div>

          {p.pendingBuilds.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Build đang chờ
              </div>
              <div className="space-y-1.5">
                {p.pendingBuilds.map((b) => {
                  const m = getMember(b.requesterId)
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Avatar member={m} size={20} />
                      <span className="text-gray-700 truncate flex-1">
                        {m?.name}
                      </span>
                      <Badge tone={b.env}>{BUILD_ENV_LABEL[b.env]}</Badge>
                      <Badge tone={b.status}>{BUILD_STATUS_LABEL[b.status]}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      {projectHealth.length === 0 && (
        <div className="col-span-full card p-10 text-center text-gray-400 text-sm">
          Chưa có dự án nào. Vào tab "Dự án" để thêm.
        </div>
      )}
    </div>
  )
}

function TimingTab({ members, tasks, getMember, getProject }) {
  const doneTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'done' && t.completedAt)
        .map((t) => ({ ...t, _duration: durationMs(t.createdAt, t.completedAt) })),
    [tasks],
  )

  const perMember = useMemo(() => {
    return members
      .map((m) => {
        const my = doneTasks.filter((t) => t.assigneeId === m.id)
        if (my.length === 0) {
          return { member: m, total: 0, avg: null, fastest: null, slowest: null }
        }
        const durations = my.map((t) => t._duration).filter((x) => x != null && x >= 0)
        const sum = durations.reduce((a, b) => a + b, 0)
        return {
          member: m,
          total: my.length,
          avg: durations.length ? sum / durations.length : null,
          fastest: durations.length ? Math.min(...durations) : null,
          slowest: durations.length ? Math.max(...durations) : null,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [members, doneTasks])

  const recentDone = useMemo(
    () =>
      [...doneTasks]
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 15),
    [doneTasks],
  )

  const topPerformer = perMember.find((p) => p.total > 0)

  return (
    <div className="space-y-5">
      {/* Per-member stats */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Timer size={16} className="text-gray-400" />
          <div className="flex-1">
            <div className="font-semibold text-gray-800 text-sm">
              Thời gian hoàn thành theo người
            </div>
            <div className="text-xs text-gray-500">
              Tính từ lúc <strong>tạo task</strong> đến lúc <strong>đánh dấu hoàn thành</strong>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Thành viên</th>
                <th className="px-4 py-3 font-medium text-right">Số task xong</th>
                <th className="px-4 py-3 font-medium">Trung bình</th>
                <th className="px-4 py-3 font-medium">Nhanh nhất</th>
                <th className="px-4 py-3 font-medium">Chậm nhất</th>
              </tr>
            </thead>
            <tbody>
              {perMember.map((row) => (
                <tr
                  key={row.member.id}
                  className="border-t border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar member={row.member} size={28} />
                      <div>
                        <div className="font-medium text-gray-800">
                          {row.member.name}
                          {topPerformer && row.member.id === topPerformer.member.id && (
                            <Trophy size={14} className="inline ml-1 text-amber-500" />
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">{row.member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.avg != null ? formatDuration(row.avg) : '-'}
                  </td>
                  <td className="px-4 py-3 text-emerald-700">
                    {row.fastest != null ? formatDuration(row.fastest) : '-'}
                  </td>
                  <td className="px-4 py-3 text-orange-700">
                    {row.slowest != null ? formatDuration(row.slowest) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent completions */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Check size={16} className="text-gray-400" />
          <div>
            <div className="font-semibold text-gray-800 text-sm">
              Task vừa hoàn thành
            </div>
            <div className="text-xs text-gray-500">
              Hiển thị {recentDone.length} task gần nhất
            </div>
          </div>
        </div>
        {recentDone.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Chưa có task nào hoàn thành. Hoàn thành 1 task để xem thống kê.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Người làm</th>
                  <th className="px-4 py-3 font-medium">Bắt đầu</th>
                  <th className="px-4 py-3 font-medium">Hoàn thành</th>
                  <th className="px-4 py-3 font-medium">Mất bao lâu</th>
                </tr>
              </thead>
              <tbody>
                {recentDone.map((t) => {
                  const m = getMember(t.assigneeId)
                  const p = getProject(t.projectId)
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{t.title}</div>
                        {p && (
                          <div className="text-[11px] text-gray-500">{p.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar member={m} size={26} />
                          <span>{m?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(t.completedAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {formatDuration(t._duration)}
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

function ActivityTab({ events, getMember, getProject }) {
  return (
    <div className="card p-5">
      {events.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Chưa có hoạt động.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <ActivityRow
              key={e.id}
              ev={e}
              getMember={getMember}
              getProject={getProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function MiniStat({ icon: Icon, label, value, tone = 'brand', onClick }) {
  const tones = {
    brand:   { bg: 'bg-brand-50',    icon: 'text-brand-600' },
    rose:    { bg: 'bg-rose-50',     icon: 'text-rose-600' },
    amber:   { bg: 'bg-amber-50',    icon: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50',  icon: 'text-emerald-600' },
    slate:   { bg: 'bg-slate-100',   icon: 'text-slate-600' },
  }
  const t = tones[tone]
  return (
    <button
      onClick={onClick}
      className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow w-full"
    >
      <div className={`w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center ${t.icon} shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-800 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </button>
  )
}

function Stat({ label, value, tone = 'gray' }) {
  const tones = {
    gray:    'text-gray-800',
    emerald: 'text-emerald-700',
    rose:    'text-rose-700',
  }
  return (
    <div className="p-2 rounded-lg bg-gray-50">
      <div className={`text-lg font-bold ${tones[tone]} leading-none`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
    </div>
  )
}

// ---- Tone tokens cho ActionItem ----
const BUILD_ENV_TONE = {
  production: {
    strip:  'bg-rose-500',
    iconBg: 'bg-rose-100 text-rose-700',
    chip:   'bg-rose-600 text-white',
    label:  'PRODUCTION',
  },
  dev: {
    strip:  'bg-blue-500',
    iconBg: 'bg-blue-100 text-blue-700',
    chip:   'bg-blue-600 text-white',
    label:  'DEV',
  },
}

const PRIORITY_TONE = {
  urgent: { strip: 'bg-rose-600',   iconBg: 'bg-rose-100 text-rose-700',   chip: 'bg-rose-600 text-white' },
  high:   { strip: 'bg-rose-500',   iconBg: 'bg-rose-100 text-rose-700',   chip: 'bg-rose-500 text-white' },
  medium: { strip: 'bg-orange-500', iconBg: 'bg-orange-100 text-orange-700', chip: 'bg-orange-500 text-white' },
  low:    { strip: 'bg-amber-400',  iconBg: 'bg-amber-100 text-amber-700',  chip: 'bg-amber-400 text-white' },
}

const BUILD_STATUS_TONE = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  building: 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse',
}

function ActionItem({ action, getMember, getProject }) {
  const { isLead } = useAuth()
  // Outer wrap luôn là div (tránh <a> lồng <a> với task link).
  // Nút "Mở →" bên phải là link riêng cho Lead.
  const Wrap = ({ to, children, ...rest }) => <div data-href={to} {...rest}>{children}</div>
  const OpenBtn = ({ to }) =>
    isLead ? (
      <Link
        to={to}
        className="shrink-0 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold inline-flex items-center gap-1 hover:underline"
      >
        Mở <ExternalLink size={12} />
      </Link>
    ) : null

  if (action.kind === 'build') {
    const b = action.data
    const member = getMember(b.requesterId)
    const project = getProject(b.projectId)
    const tone = BUILD_ENV_TONE[b.env] || BUILD_ENV_TONE.dev
    const isBuilding = b.status === 'building'

    return (
      <Wrap to="/builds" className="block group">
        <div className="flex items-stretch hover:bg-rose-50/40 transition-colors">
          {/* Colored strip indicating env */}
          <div className={`w-1 ${tone.strip} shrink-0`} />

          <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
            {/* Type icon with env-colored bg */}
            <div className={`w-10 h-10 rounded-lg ${tone.iconBg} flex items-center justify-center shrink-0`}>
              <Rocket size={18} className={isBuilding ? 'animate-pulse' : ''} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tone.chip} tracking-wider`}>
                  {tone.label}
                </span>
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {project?.name}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${BUILD_STATUS_TONE[b.status] || ''}`}>
                  {BUILD_STATUS_LABEL[b.status]}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Avatar member={member} size={16} />
                  <span className="font-medium text-gray-700">{member?.name}</span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> yêu cầu {timeFromNow(b.createdAt)}
                </span>
              </div>

              {b.note && (
                <div className="text-xs text-gray-600 mt-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-100 line-clamp-2">
                  {b.note}
                </div>
              )}
            </div>

            <OpenBtn to="/builds" />
          </div>
        </div>
      </Wrap>
    )
  }

  if (action.kind === 'task_build') {
    // Task ở trạng thái waiting_build — staff đã bấm "Chờ build"
    const tk = action.data
    const member = getMember(tk.assigneeId)
    const project = getProject(tk.projectId)
    const env = tk.buildEnv || 'dev'
    const tone = BUILD_ENV_TONE[env] || BUILD_ENV_TONE.dev

    return (
      <Wrap to="/tasks" className="block group">
        <div className="flex items-stretch hover:bg-rose-50/40 transition-colors">
          <div className={`w-1 ${tone.strip} shrink-0`} />

          <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
            <div className={`w-10 h-10 rounded-lg ${tone.iconBg} flex items-center justify-center shrink-0`}>
              <Rocket size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tone.chip} tracking-wider`}>
                  {tone.label}
                </span>
                {tk.link ? (
                  <a
                    href={tk.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-semibold text-gray-800 truncate hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                    title={`Mở: ${tk.link}`}
                  >
                    {tk.title}
                    <ExternalLink size={11} className="opacity-60 shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-gray-800 truncate">{tk.title}</span>
                )}
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  Chờ build
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Avatar member={member} size={16} />
                  <span className="font-medium text-gray-700">{member?.name}</span>
                </span>
                {project && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                      {project.code}
                    </span>
                  </>
                )}
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> chờ {timeFromNow(tk.buildRequestedAt || tk.statusChangedAt)}
                </span>
              </div>

              {tk.buildNote && (
                <div className="text-xs text-gray-600 mt-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-100 line-clamp-2">
                  {tk.buildNote}
                </div>
              )}
            </div>

            <OpenBtn to="/tasks" />
          </div>
        </div>
      </Wrap>
    )
  }

  // === Overdue task ===
  const t = action.data
  const member = getMember(t.assigneeId)
  const project = getProject(t.projectId)
  const tone = PRIORITY_TONE[t.priority] || PRIORITY_TONE.medium
  const overdueDuration = timeFromNow(t.dueDate) // "X ngày trước"

  return (
    <Wrap to="/tasks" className="block group">
      <div className="flex items-stretch hover:bg-rose-50/40 transition-colors">
        {/* Colored strip indicating priority */}
        <div className={`w-1 ${tone.strip} shrink-0`} />

        <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
          {/* Warning icon with priority-colored bg */}
          <div className={`w-10 h-10 rounded-lg ${tone.iconBg} flex items-center justify-center shrink-0`}>
            <AlertTriangle size={18} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tone.chip} tracking-wider uppercase`}>
                {PRIORITY_LABEL[t.priority]}
              </span>
              {t.link ? (
                <a
                  href={t.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-semibold text-gray-800 truncate hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                  title={`Mở: ${t.link}`}
                >
                  {t.title}
                  <ExternalLink size={11} className="opacity-60 shrink-0" />
                </a>
              ) : (
                <span className="text-sm font-semibold text-gray-800 truncate">{t.title}</span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                <Clock size={11} /> Quá hạn {overdueDuration}
              </span>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Avatar member={member} size={16} />
                <span className="font-medium text-gray-700">{member?.name}</span>
              </span>
              {project && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                    {project.code}
                  </span>
                </>
              )}
              <span className="text-gray-300">·</span>
              <Badge tone={t.status}>{TASK_STATUS_LABEL[t.status]}</Badge>
            </div>
          </div>

          <OpenBtn to="/tasks" />
        </div>
      </div>
    </Wrap>
  )
}

function MemberRow({
  row,
  getProject,
  isLeader,
  statusFilter = 'all',
  onToggleStatus,
  onAddTask,
  onEditTask,
  onChangeStatus,
  onRequestBuild,
  onCompleteBuild,
  onCancelBuild,
  onDelete,
  onRequestDeletion,
  onApproveDeletion,
  onCancelDeletion,
}) {
  const { member, activeTasks, counts, myBuilds, state } = row
  const stateLabel = {
    working:       { text: 'Đang làm',         dot: 'bg-emerald-500', tone: 'text-emerald-700' },
    waiting_build: { text: 'Đang chờ build',   dot: 'bg-orange-500',  tone: 'text-orange-700' },
    testing:       { text: 'QA đang test',     dot: 'bg-purple-500',  tone: 'text-purple-700' },
    review:        { text: 'Đang chờ review',  dot: 'bg-amber-500',   tone: 'text-amber-700' },
    idle:          { text: 'Còn task chờ làm', dot: 'bg-gray-400',    tone: 'text-gray-600' },
    free:          { text: 'Rảnh',             dot: 'bg-blue-300',    tone: 'text-blue-600' },
  }[state]

  return (
    <div className="px-5 py-3 hover:bg-gray-50/30">
      {/* Top line: identity + counts + add button */}
      <div className="flex items-center gap-4">
        <Avatar member={member} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm truncate">
              {member.name}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{member.role}</span>
            <span className={`flex items-center gap-1 text-xs ${stateLabel.tone} ml-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stateLabel.dot}`} />
              {stateLabel.text}
            </span>
          </div>
          {activeTasks.length === 0 && (
            <div className="text-sm text-gray-400 italic flex items-center gap-1 mt-0.5">
              <Coffee size={12} /> Chưa có task — bấm "+ Thêm task" bên phải
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs">
          <CountChip
            label="đang làm"
            value={counts.inProgress}
            tone="blue"
            active={statusFilter === 'in_progress'}
            onClick={() => onToggleStatus?.('in_progress')}
          />
          {counts.waitingBuild > 0 && (
            <CountChip
              label="chờ build"
              value={counts.waitingBuild}
              tone="orange"
              active={statusFilter === 'waiting_build'}
              onClick={() => onToggleStatus?.('waiting_build')}
            />
          )}
          {counts.testing > 0 && (
            <CountChip
              label="QA test"
              value={counts.testing}
              tone="purple"
              active={statusFilter === 'testing'}
              onClick={() => onToggleStatus?.('testing')}
            />
          )}
          <CountChip
            label="review"
            value={counts.review}
            tone="amber"
            active={statusFilter === 'review'}
            onClick={() => onToggleStatus?.('review')}
          />
          <CountChip
            label="chờ"
            value={counts.todo}
            tone="gray"
            active={statusFilter === 'todo'}
            onClick={() => onToggleStatus?.('todo')}
          />
          {counts.overdue > 0 && (
            <CountChip
              label="quá hạn"
              value={counts.overdue}
              tone="red"
              active={statusFilter === 'overdue'}
              onClick={() => onToggleStatus?.('overdue')}
            />
          )}
        </div>

        {myBuilds.length > 0 && (
          isLeader ? (
            <Link
              to="/builds"
              className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 hover:bg-rose-100"
              title="Build độc lập đang chờ leader"
            >
              <Rocket size={12} /> {myBuilds.length}
            </Link>
          ) : (
            <span
              className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-100"
              title="Build của bạn đang chờ leader"
            >
              <Rocket size={12} /> {myBuilds.length}
            </span>
          )
        )}

        <button
          onClick={onAddTask}
          className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-100"
          title={`Thêm task cho ${member.name}`}
        >
          <Plus size={12} /> Thêm task
        </button>
      </div>

      {/* Active tasks list */}
      {activeTasks.length > 0 && (
        <div className="mt-2 ml-14 space-y-1.5">
          {activeTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              project={getProject(task.projectId)}
              isLeader={isLeader}
              onEdit={() => onEditTask(task)}
              onChangeStatus={(s) => onChangeStatus(task, s)}
              onRequestBuild={() => onRequestBuild(task)}
              onCompleteBuild={() => onCompleteBuild(task)}
              onCancelBuild={() => onCancelBuild(task)}
              onDelete={() => onDelete(task)}
              onRequestDeletion={() => onRequestDeletion(task)}
              onApproveDeletion={() => onApproveDeletion(task)}
              onCancelDeletion={() => onCancelDeletion(task)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  project,
  isLeader,
  onEdit,
  onChangeStatus,
  onRequestBuild,
  onCompleteBuild,
  onCancelBuild,
  onDelete,
  onRequestDeletion,
  onApproveDeletion,
  onCancelDeletion,
}) {
  const { user } = useAuth()
  const { isTaskPending } = useApp()
  const overdue = isOverdue(task.dueDate)
  const isWaitingBuild = task.status === 'waiting_build'
  const pendingDeletion = !!task.deletionRequestedAt
  const isMyDeletion = task.deletionRequestedById === user?.id
  const pending = isTaskPending(task.id)

  const stateSince = taskStateSince(task)
  const elapsed = elapsedFrom(stateSince)
  const elapsedTitle = stateSince ? `Vào trạng thái này từ: ${formatDateTime(stateSince)}` : ''

  return (
    <div
      className={`relative flex items-center gap-2 text-sm py-1.5 px-2 rounded-md border transition-opacity ${
        pending ? 'opacity-60 pointer-events-none' : ''
      } ${
        pendingDeletion
          ? 'border-rose-300 bg-rose-50/60'
          : isWaitingBuild
            ? 'border-orange-200 bg-orange-50/40'
            : overdue
              ? 'border-red-100 bg-red-50/30'
              : 'border-transparent hover:bg-white'
      }`}
    >
      {pending && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-1 text-xs text-brand-600 font-medium bg-white/95 border border-brand-200 px-2 py-1 rounded-md shadow-sm">
          <Loader2 size={12} className="animate-spin" /> Đang lưu...
        </span>
      )}
      <span className="text-gray-400 text-xs">→</span>
      {task.link ? (
        <a
          href={task.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 truncate flex-1 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
          title={`Mở: ${task.link}`}
        >
          {task.title}
          <ExternalLink size={11} className="opacity-60 shrink-0" />
        </a>
      ) : (
        <span className="text-gray-800 truncate flex-1">{task.title}</span>
      )}

      {isWaitingBuild ? (
        <Badge tone={task.status}>{TASK_STATUS_LABEL[task.status]}</Badge>
      ) : (
        <StatusDropdown task={task} onChange={onChangeStatus} />
      )}

      {isWaitingBuild && task.buildEnv && (
        <Badge tone={task.buildEnv}>{BUILD_ENV_LABEL[task.buildEnv]}</Badge>
      )}

      <span
        className="hidden md:inline-flex items-center gap-1 text-[11px] text-gray-500 tabular-nums"
        title={elapsedTitle}
      >
        <Timer size={11} /> {elapsed}
      </span>

      <span
        className="hidden lg:inline-flex items-center gap-1 text-[11px] text-gray-400 tabular-nums"
        title={`Tạo lúc: ${formatDateTime(task.createdAt)}`}
      >
        <CalendarClock size={11} /> tạo {timeFromNow(task.createdAt)}
      </span>

      {project && (
        <span className="text-[11px] text-gray-400 hidden lg:inline">
          [{project.code}]
        </span>
      )}

      {task.dueDate && (
        <span
          className={`text-[11px] hidden lg:inline ${
            overdue ? 'text-red-600 font-medium' : 'text-gray-400'
          }`}
          title={`Hạn: ${formatDateTime(task.dueDate)}`}
        >
          hạn {formatDate(task.dueDate)}
        </span>
      )}

      {/* Action buttons */}
      {pendingDeletion ? (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-rose-700 font-medium italic mr-1 inline-flex items-center gap-1">
            <AlertTriangle size={11} /> Chờ Lead duyệt xoá
          </span>
          {isLeader && (
            <>
              <button
                onClick={onApproveDeletion}
                className="flex items-center gap-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-md"
                title="Duyệt yêu cầu xoá — task sẽ bị xoá vĩnh viễn"
              >
                <Check size={12} /> Duyệt xoá
              </button>
              <button
                onClick={onCancelDeletion}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-md"
                title="Từ chối — giữ lại task"
              >
                <Undo2 size={12} /> Từ chối
              </button>
            </>
          )}
          {!isLeader && isMyDeletion && (
            <button
              onClick={onCancelDeletion}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-md"
              title="Huỷ yêu cầu xoá của bạn"
            >
              <Undo2 size={12} /> Huỷ xin
            </button>
          )}
        </div>
      ) : isWaitingBuild ? (
        <div className="flex items-center gap-1">
          {isLeader && (
            <button
              onClick={onCompleteBuild}
              className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md"
              title="Đánh dấu đã build xong → chuyển vào Lịch sử Build"
            >
              <Check size={12} /> Đã build
            </button>
          )}
          {!isLeader && (
            <span className="text-[11px] text-orange-600 italic mr-1">
              Đang chờ leader build...
            </span>
          )}
          <button
            onClick={onCancelBuild}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-md"
            title="Huỷ yêu cầu build, đưa task về trạng thái cũ"
          >
            <Undo2 size={12} /> Huỷ
          </button>
        </div>
      ) : task.status !== 'done' ? (
        <button
          onClick={onRequestBuild}
          className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md border border-orange-100"
          title="Gửi yêu cầu build cho task này"
        >
          <Rocket size={12} /> Chờ build
        </button>
      ) : null}

      {/* Edit (Lead-only) + Delete (Lead xoá ngay; Staff xin xoá) — ẩn khi đã có yêu cầu xoá */}
      {!pendingDeletion && isLeader && (
        <button
          onClick={onEdit}
          className="p-1 rounded-md text-gray-400 hover:text-brand-700 hover:bg-brand-50"
          title="Sửa task (tiêu đề, hạn, ưu tiên...)"
        >
          <Pencil size={13} />
        </button>
      )}

      {!pendingDeletion && (
        isLeader ? (
          <button
            onClick={onDelete}
            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Xoá task (xoá ngay)"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <button
            onClick={onRequestDeletion}
            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
            title="Xin Lead duyệt xoá task này"
          >
            <Trash2 size={13} />
          </button>
        )
      )}
    </div>
  )
}

/* =========================================================
   MODALS
   ========================================================= */

function AddTaskModal({ open, member, projects, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    link: '',
    projectId: '',
    priority: 'medium',
    dueDate: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        link: '',
        projectId: projects[0]?.id ?? '',
        priority: 'medium',
        dueDate: '',
      })
      setSubmitting(false)
    }
    // Chỉ reset khi modal mở lần đầu — không reset khi `projects` thay đổi
    // (combobox có thể tạo project mới giữa chừng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!member) return null

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!form.title.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description,
        link: form.link?.trim() || null,
        assigneeId: member.id,
        projectId: form.projectId,
        status: 'todo',
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={`Thêm task cho ${member.name}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Huỷ</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Đang tạo...
              </span>
            ) : 'Tạo task'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
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
            placeholder="VD: HNCW-348 [Vận hành] Sửa form đăng ký"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Mô tả ngắn</label>
          <textarea
            className="input"
            rows={2}
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
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hạn hoàn thành</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
      </form>
    </Modal>
  )
}

function EditTaskModal({ open, task, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    link: '',
    projectId: '',
    priority: 'medium',
    dueDate: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && task) {
      setForm({
        title: task.title ?? '',
        description: task.description ?? '',
        link: task.link ?? '',
        projectId: task.projectId ?? '',
        priority: task.priority ?? 'medium',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      })
      setSubmitting(false)
    }
  }, [open, task])

  if (!task) return null

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!form.title.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description,
        link: form.link?.trim() || null,
        projectId: form.projectId,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Sửa task"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Huỷ</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Đang lưu...
              </span>
            ) : 'Cập nhật'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
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
            autoFocus
          />
        </div>
        <div>
          <label className="label">Mô tả ngắn</label>
          <textarea
            className="input"
            rows={2}
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
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hạn hoàn thành</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <div className="text-[11px] text-gray-500 mt-1">
            Để trống nếu task không có hạn cụ thể.
          </div>
        </div>
      </form>
    </Modal>
  )
}

function RequestBuildModal({ open, task, getProject, onClose, onSubmit }) {
  const [env, setEnv] = useState('dev')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Task đang ở "QA test" → bước tiếp theo logic là build Production.
  const defaultEnv = task?.status === 'testing' ? 'production' : 'dev'

  useEffect(() => {
    if (open) {
      setEnv(defaultEnv)
      setNote('')
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!task) return null
  const project = getProject(task.projectId)

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(env, note)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Gửi yêu cầu build"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Huỷ</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Đang gửi...
              </span>
            ) : 'Gửi yêu cầu'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-0.5">Task</div>
          <div className="font-medium text-gray-800">{task.title}</div>
          {project && (
            <div className="text-xs text-gray-500 mt-0.5">{project.name}</div>
          )}
        </div>
        <div>
          <label className="label">Môi trường build</label>
          <div className="flex gap-2">
            {['dev', 'production'].map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEnv(e)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  env === e
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {BUILD_ENV_LABEL[e]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Ghi chú cho leader (tuỳ chọn)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="VD: Đã test xong luồng A, B. Build dev để QA check."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}

function CompleteBuildModal({ open, task, onClose, onSubmit }) {
  const [version, setVersion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setVersion('')
      setSubmitting(false)
    }
  }, [open])

  if (!task) return null

  const isDev = task.buildEnv === 'dev'
  const headlineText = isDev
    ? 'Task sẽ tự chuyển sang Chờ build Production'
    : 'Task sẽ chuyển sang Hoàn thành'
  const footerText = isDev
    ? 'Build Dev được ghi vào Lịch sử Build. Task TỰ chuyển sang Chờ build Production để bạn build tiếp.'
    : 'Task sẽ Hoàn thành và xuất hiện trong Lịch sử Build.'

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(version.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={isDev ? 'Đã build Dev — chuẩn bị build Production' : 'Đã build Production — hoàn thành task'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Huỷ</button>
          <button
            className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Đang xử lý...
              </span>
            ) : (
              <><Check size={14} /> Xác nhận đã build</>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="p-3 bg-orange-50/60 border border-orange-100 rounded-lg">
          <div className="text-xs text-orange-700 mb-0.5">{headlineText}</div>
          <div className="font-medium text-gray-800">{task.title}</div>
          {task.buildEnv && (
            <div className="text-xs text-gray-600 mt-1">
              Đang build cho môi trường: <strong>{BUILD_ENV_LABEL[task.buildEnv]}</strong>
            </div>
          )}
          {task.buildNote && (
            <div className="text-xs text-gray-600 mt-1">
              Ghi chú: {task.buildNote}
            </div>
          )}
        </div>
        <div>
          <label className="label">Phiên bản đã build (tuỳ chọn)</label>
          <input
            className="input"
            placeholder="VD: v1.4.3"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            autoFocus
          />
          <div className="text-[11px] text-gray-500 mt-1">{footerText}</div>
        </div>
      </div>
    </Modal>
  )
}

const STATUS_DROPDOWN_OPTIONS = ['todo', 'in_progress', 'review', 'testing', 'done']
// Staff không tự đánh dấu "Hoàn thành" — chỉ Lead làm.
const STATUS_DROPDOWN_OPTIONS_STAFF = ['todo', 'in_progress', 'review', 'testing']

function StatusDropdown({ task, onChange }) {
  const { isStaff } = useAuth()
  const baseOptions = isStaff ? STATUS_DROPDOWN_OPTIONS_STAFF : STATUS_DROPDOWN_OPTIONS
  // Staff: task đã "Đang làm" → không cho quay về "Chưa làm". Lead toàn quyền.
  const options = (isStaff && task.startedAt)
    ? baseOptions.filter((s) => s !== 'todo')
    : baseOptions
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      // Nếu khoảng cách tới đáy viewport < chiều cao dropdown ước lượng → pop lên trên
      const rect = btnRef.current.getBoundingClientRect()
      const dropdownHeight = 220 // ~4 options + header + padding
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)
    }
    setOpen((o) => !o)
  }

  const STATUS_BADGE_CLS = {
    todo:        'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-50 text-blue-700',
    review:      'bg-amber-50 text-amber-700',
    done:        'bg-emerald-50 text-emerald-700',
  }
  const STATUS_DOT = {
    todo:        'bg-gray-400',
    in_progress: 'bg-blue-500',
    review:      'bg-amber-500',
    done:        'bg-emerald-500',
  }

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 cursor-pointer ${STATUS_BADGE_CLS[task.status] || STATUS_BADGE_CLS.todo}`}
        title="Click để đổi trạng thái"
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[task.status] || STATUS_DOT.todo}`} />
        {TASK_STATUS_LABEL[task.status]}
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <div className={`absolute right-0 z-30 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[170px] ${
          openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-gray-400 border-b border-gray-100">
            Đổi trạng thái
          </div>
          {options.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s)
                setOpen(false)
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLS[s]}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                {TASK_STATUS_LABEL[s]}
              </span>
              {s === task.status && (
                <Check size={14} className="text-emerald-600 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CountChip({ label, value, tone, onClick, active = false }) {
  const tones = {
    blue:   'bg-blue-50 text-blue-700',
    amber:  'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
    gray:   'bg-gray-100 text-gray-700',
    red:    'bg-red-50 text-red-700',
  }
  const activeTones = {
    blue:   'bg-blue-600 text-white ring-2 ring-blue-200',
    amber:  'bg-amber-600 text-white ring-2 ring-amber-200',
    orange: 'bg-orange-600 text-white ring-2 ring-orange-200',
    purple: 'bg-purple-600 text-white ring-2 ring-purple-200',
    gray:   'bg-gray-700 text-white ring-2 ring-gray-200',
    red:    'bg-red-600 text-white ring-2 ring-red-200',
  }
  const zero = value === 0 && tone !== 'red'
  const base = active
    ? activeTones[tone]
    : zero
      ? 'bg-gray-50 text-gray-400'
      : tones[tone]
  const cls = `px-2 py-1 rounded text-[11px] transition-colors ${base} ${
    onClick ? 'cursor-pointer hover:opacity-80' : ''
  }`
  const content = (
    <>
      {label} <span className="font-semibold">{value}</span>
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cls}
        title={active ? `Bỏ lọc "${label}"` : `Lọc theo "${label}"`}
      >
        {content}
      </button>
    )
  }
  return <span className={cls}>{content}</span>
}

function FilterPill({ active, tone = 'slate', onClick, children }) {
  const inactive = {
    slate:  'bg-gray-100 text-gray-700 hover:bg-gray-200',
    blue:   'bg-blue-50 text-blue-700 hover:bg-blue-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    amber:  'bg-amber-50 text-amber-700 hover:bg-amber-100',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    gray:   'bg-gray-50 text-gray-600 hover:bg-gray-100',
    red:    'bg-red-50 text-red-700 hover:bg-red-100',
  }
  const activeCls = {
    slate:  'bg-gray-800 text-white',
    blue:   'bg-blue-600 text-white',
    orange: 'bg-orange-600 text-white',
    amber:  'bg-amber-600 text-white',
    purple: 'bg-purple-600 text-white',
    gray:   'bg-gray-700 text-white',
    red:    'bg-red-600 text-white',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? activeCls[tone] : inactive[tone]
      }`}
    >
      {children}
    </button>
  )
}

function ActivityRow({ ev, getMember, getProject }) {
  let icon, color, content
  if (ev.kind === 'build_request') {
    const b = ev.data
    const m = getMember(b.requesterId)
    const p = getProject(b.projectId)
    icon = Rocket
    color = 'text-rose-600 bg-rose-50'
    content = (
      <>
        <strong>{m?.name}</strong> yêu cầu build{' '}
        <span className="text-gray-500">[{BUILD_ENV_LABEL[b.env]}]</span> {p?.name}
      </>
    )
  } else if (ev.kind === 'build_done') {
    const b = ev.data
    const m = getMember(b.requesterId)
    const p = getProject(b.projectId)
    icon = b.status === 'success' ? CheckCircle2 : AlertTriangle
    color =
      b.status === 'success'
        ? 'text-emerald-600 bg-emerald-50'
        : 'text-red-600 bg-red-50'
    content = (
      <>
        Build {b.status === 'success' ? 'thành công' : 'thất bại'} cho{' '}
        <strong>{p?.name}</strong>{' '}
        <span className="text-gray-500">({m?.name})</span>
      </>
    )
  } else {
    const t = ev.data
    const m = getMember(t.assigneeId)
    const p = getProject(t.projectId)
    icon = ListChecks
    color = 'text-brand-600 bg-brand-50'
    content = (
      <>
        <strong>{m?.name}</strong> nhận task <strong>{t.title}</strong>
        {p && <span className="text-gray-500"> [{p.code}]</span>}
      </>
    )
  }
  const Icon = icon
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-700 leading-snug">{content}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {timeFromNow(ev.ts)} · {formatDateTime(ev.ts)}
        </div>
      </div>
    </div>
  )
}
