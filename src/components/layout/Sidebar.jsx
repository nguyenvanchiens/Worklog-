import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Rocket,
  History,
  Boxes,
} from 'lucide-react'

const items = [
  { to: '/',          label: 'Tổng quan',     icon: LayoutDashboard },
  { to: '/tasks',     label: 'Công việc',     icon: ListChecks },
  { to: '/builds',    label: 'Yêu cầu Build', icon: Rocket },
  { to: '/history',   label: 'Lịch sử Build', icon: History },
  { to: '/members',   label: 'Thành viên',    icon: Users },
  { to: '/projects',  label: 'Dự án',         icon: Boxes },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold">
          T
        </div>
        <div>
          <div className="font-bold text-gray-800 leading-tight">TeamFlow</div>
          <div className="text-xs text-gray-500">Quản lý công việc team</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-400 border-t border-gray-100">
        v0.1.0 · FE only · Mock data
      </div>
    </aside>
  )
}
