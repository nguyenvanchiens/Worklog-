import { useState } from 'react'
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onLogin(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-brand-200">
            T
          </div>
          <div className="mt-3 text-xl font-bold text-gray-800">TeamFlow</div>
          <div className="text-sm text-gray-500">Quản lý công việc team</div>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-gray-800 mb-1">Đăng nhập</h1>
          <p className="text-sm text-gray-500 mb-5">
            Đăng nhập bằng email + mật khẩu của bạn.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="email@hncjsc.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Đang xác thực...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn size={16} /> Đăng nhập
                </span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          Quên mật khẩu? Liên hệ Lead để cấp lại.
        </div>
      </div>
    </div>
  )
}
