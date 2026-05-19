import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import ChatBot from '../ChatBot.jsx'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </div>
  )
}
