import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell, Search, RotateCcw, LogOut, ShieldCheck, User, ChevronDown, KeyRound, Loader2, Check,
} from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useConfirm } from '../common/ConfirmProvider.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'

const titleMap = {
  '/':         { title: 'Tổng quan',     subtitle: 'Theo dõi tình hình team và các build chờ xử lý' },
  '/tasks':    { title: 'Công việc',     subtitle: 'Quản lý task của từng thành viên' },
  '/backlog':  { title: 'Tồn đọng',      subtitle: 'Task chưa làm đến, chưa gán người' },
  '/builds':   { title: 'Yêu cầu Build', subtitle: 'Danh sách build dev / production' },
  '/history':  { title: 'Lịch sử Build', subtitle: 'Các build đã hoàn thành hoặc thất bại' },
  '/members':  { title: 'Thành viên',    subtitle: 'Danh sách team' },
  '/projects': { title: 'Dự án',         subtitle: 'Danh sách dự án đang vận hành' },
}

export default function Header() {
  const { pathname } = useLocation()
  const meta = titleMap[pathname] || { title: 'TeamFlow' }
  const { buildRequests, resetDemoData } = useApp()
  const { user, isLead, logout } = useAuth()
  const confirm = useConfirm()

  const [menuOpen, setMenuOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const menuRef = useRef(null)

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const onLogout = async () => {
    setMenuOpen(false)
    const ok = await confirm({
      title: 'Đăng xuất?',
      message: 'Bạn sẽ phải đăng nhập lại để vào hệ thống.',
      confirmLabel: 'Đăng xuất',
      tone: 'warning',
    })
    if (ok) logout()
  }

  const pendingBuilds = buildRequests.filter(
    (b) => b.status === 'pending' || b.status === 'building',
  ).length

  return (
    <>
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center gap-4">
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-gray-800">{meta.title}</h1>
        {meta.subtitle && (
          <p className="text-xs text-gray-500">{meta.subtitle}</p>
        )}
      </div>

      <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 w-72">
        <Search size={16} className="text-gray-400" />
        <input
          placeholder="Tìm task, thành viên..."
          className="bg-transparent outline-none px-2 text-sm w-full"
        />
      </div>

      <button
        onClick={resetDemoData}
        title="Tải lại dữ liệu từ server"
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <RotateCcw size={18} />
      </button>

      <div className="relative">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <Bell size={18} />
        </button>
        {pendingBuilds > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
            {pendingBuilds}
          </span>
        )}
      </div>

      {/* User menu */}
      <div className="relative pl-3 border-l border-gray-100" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-100 transition-colors"
          title="Tài khoản"
        >
          <Avatar member={user} size={32} />
          <div className="flex flex-col leading-tight text-left">
            <span className="text-sm font-medium text-gray-800">{user?.name}</span>
            <span
              className={`text-[11px] inline-flex items-center gap-1 ${
                isLead ? 'text-brand-700' : 'text-gray-500'
              }`}
            >
              {isLead ? <ShieldCheck size={11} /> : <User size={11} />}
              {isLead ? 'Lead' : 'Staff'} · {user?.role}
            </span>
          </div>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-800 truncate">{user?.name}</div>
              {user?.email && <div className="text-[11px] text-gray-500 truncate">{user.email}</div>}
            </div>
            <button
              onClick={() => { setMenuOpen(false); setPwOpen(true) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <KeyRound size={15} className="text-gray-400" /> Đổi mật khẩu
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
            >
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>

    {/* Đặt NGOÀI <header> vì header có backdrop-blur → sẽ neo position:fixed của Modal sai chỗ. */}
    <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  )
}

function ChangePasswordModal({ open, onClose }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrent(''); setNext(''); setConfirmPw('')
      setBusy(false); setError(null); setDone(false)
    }
  }, [open])

  const submit = async (e) => {
    e?.preventDefault()
    setError(null)
    if (!current) return setError('Nhập mật khẩu hiện tại.')
    if (next.length < 4) return setError('Mật khẩu mới tối thiểu 4 ký tự.')
    if (next !== confirmPw) return setError('Xác nhận mật khẩu mới không khớp.')
    setBusy(true)
    try {
      await changePassword(current, next)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Đổi mật khẩu"
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Huỷ</button>
          <button className="btn-primary" onClick={submit} disabled={busy || done}>
            {busy
              ? <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Đang đổi...</span>
              : 'Đổi mật khẩu'}
          </button>
        </>
      }
    >
      {done ? (
        <div className="py-4 text-center text-sm text-emerald-700 inline-flex items-center gap-2 justify-center w-full">
          <Check size={18} /> Đổi mật khẩu thành công!
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Mật khẩu hiện tại</label>
            <input
              type="password"
              className="input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">Mật khẩu mới</label>
            <input
              type="password"
              className="input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Tối thiểu 4 ký tự"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              className="input"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
