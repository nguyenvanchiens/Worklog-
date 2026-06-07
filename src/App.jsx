import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Backlog from './pages/Backlog.jsx'
import BuildRequests from './pages/BuildRequests.jsx'
import BuildHistory from './pages/BuildHistory.jsx'
import Members from './pages/Members.jsx'
import Projects from './pages/Projects.jsx'
import { useAuth } from './context/AuthContext.jsx'

function LeadOnly({ children }) {
  const { isLead } = useAuth()
  return isLead ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks"    element={<LeadOnly><Tasks /></LeadOnly>} />
        <Route path="/backlog"  element={<LeadOnly><Backlog /></LeadOnly>} />
        <Route path="/builds"   element={<LeadOnly><BuildRequests /></LeadOnly>} />
        <Route path="/history"  element={<LeadOnly><BuildHistory /></LeadOnly>} />
        <Route path="/members"  element={<LeadOnly><Members /></LeadOnly>} />
        <Route path="/projects" element={<LeadOnly><Projects /></LeadOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
