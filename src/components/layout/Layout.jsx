import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import ChatBot from '../ChatBot.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Layout() {
  const { isLead } = useAuth()
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      {/* Trợ lý chat chỉ dành cho Lead */}
      {isLead && <ChatBot />}
    </div>
  )
}
