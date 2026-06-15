import { useState } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../api/client.js'

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok: bool, message, url? }

  const registerWebhook = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/telegram/set-webhook')
      setResult({ ok: true, message: res?.message || 'Đã đăng ký webhook.', url: res?.url })
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
            <Send size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-800">Telegram — Cập nhật trạng thái qua nút bấm</div>
            <div className="text-xs text-gray-500">Cho phép bấm "Đã build" / "Huỷ build" ngay trong Telegram.</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          Bấm nút bên dưới để đăng ký webhook với Telegram (chạy 1 lần sau khi deploy, hoặc khi
          đổi URL/secret). URL và secret được đọc từ cấu hình BE (<code className="px-1 bg-gray-100 rounded">.env</code>).
        </p>

        <button className="btn-primary mt-4" onClick={registerWebhook} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Đang đăng ký…' : 'Đăng ký webhook Telegram'}
        </button>

        {result && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
              result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-medium">{result.message}</div>
              {result.url && <div className="text-xs mt-0.5 break-all opacity-80">{result.url}</div>}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500 space-y-1">
          <div>• Chỉ Telegram ID trong danh sách <code className="px-1 bg-gray-100 rounded">TelegramLeadIds</code> mới bấm nút được.</div>
          <div>• Nếu báo lỗi chứng chỉ HTTPS, đổi <code className="px-1 bg-gray-100 rounded">TelegramWebhookUrl</code> sang URL Cloudflare worker rồi đăng ký lại.</div>
        </div>
      </div>
    </div>
  )
}
