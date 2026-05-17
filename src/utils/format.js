export function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`
}

export function timeFromNow(iso) {
  if (!iso) return '-'
  const ms = new Date(iso).getTime() - Date.now()
  const diff = Math.abs(ms)
  const sign = ms >= 0 ? 1 : -1
  const day = 86400000
  const hour = 3600000
  const minute = 60000
  if (diff < minute) return 'vừa xong'
  if (diff < hour) {
    const m = Math.round(diff / minute)
    return sign > 0 ? `còn ${m} phút` : `${m} phút trước`
  }
  if (diff < day) {
    const h = Math.round(diff / hour)
    return sign > 0 ? `còn ${h} giờ` : `${h} giờ trước`
  }
  const d = Math.round(diff / day)
  return sign > 0 ? `còn ${d} ngày` : `${d} ngày trước`
}

export function isOverdue(iso) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

// Định dạng khoảng thời gian (ms) → chuỗi gần gũi
export function formatDuration(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return '-'
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (ms < min) return 'dưới 1 phút'
  if (ms < hour) return `${Math.round(ms / min)} phút`
  if (ms < day) {
    const h = Math.floor(ms / hour)
    const m = Math.round((ms - h * hour) / min)
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`
  }
  const d = Math.floor(ms / day)
  const h = Math.round((ms - d * day) / hour)
  return h > 0 ? `${d} ngày ${h} giờ` : `${d} ngày`
}

// Khoảng cách giữa 2 mốc ISO (ms), null nếu thiếu
export function durationMs(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  return new Date(toIso).getTime() - new Date(fromIso).getTime()
}

// "X giờ" / "X ngày" tính từ iso đến hiện tại
export function elapsedFrom(iso) {
  if (!iso) return '-'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return '-'
  return formatDuration(ms)
}

// Mốc thời gian "bắt đầu trạng thái hiện tại" cho 1 task
export function taskStateSince(task) {
  if (!task) return null
  if (task.status === 'in_progress')
    return task.startedAt || task.statusChangedAt || task.createdAt
  if (task.status === 'waiting_build')
    return task.buildRequestedAt || task.statusChangedAt || task.createdAt
  if (task.status === 'done')
    return task.completedAt || task.statusChangedAt || task.createdAt
  return task.statusChangedAt || task.createdAt
}
