import { createContext, useContext, useEffect, useState } from 'react'
import { api, auth, setOnUnauthorized } from '../api/client.js'
import Login from '../pages/Login.jsx'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => auth.getToken())

  useEffect(() => {
    // Khi API client phát hiện 401 → reset token state → quay về Login
    setOnUnauthorized(() => setTokenState(null))
  }, [])

  const login = async (password) => {
    const result = await api.post('/auth/login', { password }, { skipAuth: true })
    auth.setToken(result.token)
    setTokenState(result.token)
    return result
  }

  const logout = () => {
    auth.clearToken()
    setTokenState(null)
  }

  if (!token) {
    return <Login onLogin={login} />
  }

  return (
    <AuthContext.Provider value={{ token, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
