import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'

const ConfirmContext = createContext(null)

const TONES = {
  default: {
    icon: HelpCircle,
    iconBg: 'bg-brand-50 text-brand-600',
    confirmBtn: 'btn-primary',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50 text-amber-600',
    confirmBtn: 'btn-primary bg-amber-600 hover:bg-amber-700',
  },
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-50 text-red-600',
    confirmBtn: 'btn-danger',
  },
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        title: opts.title || 'Xác nhận',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Xác nhận',
        cancelLabel: opts.cancelLabel || 'Huỷ',
        tone: opts.tone || 'default',
      })
    })
  }, [])

  const close = (result) => {
    const r = resolverRef.current
    resolverRef.current = null
    setState(null)
    r?.(result)
  }

  const t = TONES[state?.tone] || TONES.default
  const Icon = t.icon

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => close(false)}>
              {state?.cancelLabel}
            </button>
            <button
              className={t.confirmBtn}
              onClick={() => close(true)}
              autoFocus
            >
              {state?.confirmLabel}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.iconBg}`}>
            <Icon size={20} />
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-line pt-1.5">
            {state?.message}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
