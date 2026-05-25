import { useLocation } from 'react-router-dom'
import { Bell, Search, RotateCcw, LogOut, ShieldCheck, User } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useConfirm } from '../common/ConfirmProvider.jsx'
import Avatar from '../common/Avatar.jsx'

const titleMap = {
  '/':         { title: 'Tổng quan',     subtitle: 'Theo dõi tình hình team và các build chờ xử lý' },
  '/tasks':    { title: 'Công việc',     subtitle: 'Quản lý task của từng thành viên' },
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

  const onLogout = async () => {
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

      <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
        <Avatar member={user} size={32} />
        <div className="flex flex-col leading-tight">
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
        <button
          onClick={onLogout}
          title="Đăng xuất"
          className="p-2 ml-1 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
