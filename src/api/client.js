// Lớp giao tiếp với BE.
// Override base URL bằng biến môi trường VITE_API_BASE nếu cần.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5050/api'

const TOKEN_KEY = 'tm_auth_token'

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
}

// Khi gặp 401, gọi callback này (gắn từ AuthProvider) để FE đẩy về login.
let onUnauthorized = null
export function setOnUnauthorized(fn) {
  onUnauthorized = fn
}

async function request(method, path, body, { skipAuth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (!skipAuth) {
    const token = auth.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch (e) {
    throw new Error(
      `Không kết nối được tới BE (${BASE}). Hãy chắc chắn server đang chạy: cd BE && dotnet run`,
    )
  }

  // Chỉ coi 401 là "phiên hết hạn" cho request đã gắn token.
  // Còn 401 từ login (skipAuth) là "mật khẩu sai" — để BE message thật chạy xuống dưới.
  if (res.status === 401 && !skipAuth) {
    auth.clearToken()
    onUnauthorized?.()
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }

  if (!res.ok) {
    let message
    try {
      const errBody = await res.json()
      message = errBody.message || errBody.title || JSON.stringify(errBody)
    } catch {
      message = res.statusText || `HTTP ${res.status}`
    }
    throw new Error(message)
  }

  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body ?? {}, opts),
  put: (path, body, opts) => request('PUT', path, body ?? {}, opts),
  del: (path, opts) => request('DELETE', path, undefined, opts),
}

export const API_BASE = BASE
