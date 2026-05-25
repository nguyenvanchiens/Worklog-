import { createContext, useContext, useEffect, useState } from 'react'
import { api, auth, setOnUnauthorized } from '../api/client.js'
import Login from '../pages/Login.jsx'

const AuthContext = createContext(null)

const USER_KEY = 'tm_auth_user'

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeUser(u) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
  else   localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => auth.getToken())
  const [user, setUserState] = useState(() => readUser())
  const [verifying, setVerifying] = useState(!!auth.getToken())

  useEffect(() => {
    setOnUnauthorized(() => {
      setTokenState(null)
      setUserState(null)
      writeUser(null)
    })
  }, [])

  // Khi có token nhưng chưa có user (hoặc refresh trang) → gọi /auth/me để khôi phục.
  useEffect(() => {
    let cancelled = false
    async function verify() {
      if (!token) {
        setVerifying(false)
        return
      }
      try {
        const me = await api.get('/auth/me')
        if (!cancelled) {
          setUserState(me)
          writeUser(me)
        }
      } catch {
        // 401 đã được client.js xử lý — sẽ trigger setOnUnauthorized.
      } finally {
        if (!cancelled) setVerifying(false)
      }
    }
    verify()
    return () => { cancelled = true }
  }, [token])

  const login = async (email, password) => {
    const result = await api.post('/auth/login', { email, password }, { skipAuth: true })
    auth.setToken(result.token)
    setTokenState(result.token)
    setUserState(result.user)
    writeUser(result.user)
    return result
  }

  const logout = () => {
    auth.clearToken()
    writeUser(null)
    setTokenState(null)
    setUserState(null)
  }

  if (!token) {
    return <Login onLogin={login} />
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isLead  = user?.accountRole === 'Lead'
  const isStaff = user?.accountRole === 'Staff'

  return (
    <AuthContext.Provider value={{ token, user, isLead, isStaff, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
