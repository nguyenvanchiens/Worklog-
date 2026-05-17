import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

/**
 * Combobox để chọn dự án có sẵn HOẶC tự nhập tên mới (sẽ tự tạo project).
 *
 * Props:
 *  - value: projectId hiện tại (string | null)
 *  - onChange(projectId): callback khi chọn / tạo mới
 *  - placeholder
 *  - autoFocus
 */
export default function ProjectCombobox({ value, onChange, placeholder, autoFocus }) {
  const { projects, addProject } = useApp()

  const selected = projects.find((p) => p.id === value)
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Khi prop value đổi từ ngoài (vd reset form), sync lại
  useEffect(() => {
    setQuery(selected?.name ?? '')
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const trimmed = query.trim()
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    )
  }, [projects, trimmed])

  const exactMatch = projects.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  )
  const canCreateNew = trimmed.length > 0 && !exactMatch

  const selectProject = (p) => {
    setQuery(p.name)
    onChange(p.id)
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const code = makeCode(trimmed, new Set(projects.map((p) => p.code)))
      const created = await addProject({ name: trimmed, code })
      onChange(created.id)
      setQuery(created.name)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          className="input pl-9"
          placeholder={placeholder || 'Tìm dự án hoặc nhập tên mới...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            // Nếu xoá hết hoặc đổi sang text khác → reset projectId
            if (selected && e.target.value !== selected.name) onChange(null)
          }}
          onFocus={(e) => {
            setOpen(true)
            // Bôi đen text sẵn có để user gõ là replace luôn
            e.target.select()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreateNew) {
              e.preventDefault()
              handleCreate()
            }
          }}
          autoFocus={autoFocus}
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
          {filtered.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-gray-400">
                {trimmed ? 'Khớp với' : 'Dự án chính'}
              </div>
              {filtered.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectProject(p)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[11px] font-bold shrink-0">
                    {p.code}
                  </span>
                  <span className="truncate flex-1">{p.name}</span>
                  {value === p.id && (
                    <Check size={14} className="text-emerald-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {canCreateNew && (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-brand-50 text-brand-700"
              >
                <Plus size={14} />
                <span>
                  Tạo dự án mới: <strong>"{trimmed}"</strong>
                </span>
                {creating && <span className="ml-auto text-xs text-gray-500">đang tạo...</span>}
              </button>
            </div>
          )}

          {filtered.length === 0 && !canCreateNew && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              Nhập tên để tìm hoặc tạo dự án mới
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Sinh code viết tắt từ tên project. VD: "Supermarket Web" → "SW", "Office Web" → "OW"
function makeCode(name, existingCodes) {
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip Vietnamese diacritics
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9 \-_]/g, '')
    .toUpperCase()
  const words = clean.split(/[\s\-_]+/).filter(Boolean)
  let base
  if (words.length === 0) {
    base = 'PRJ'
  } else if (words.length === 1) {
    base = words[0].slice(0, 5)
  } else {
    base = words.map((w) => w[0]).join('').slice(0, 5)
  }
  if (!existingCodes.has(base)) return base
  let i = 2
  while (existingCodes.has(`${base}${i}`)) i++
  return `${base}${i}`.slice(0, 8)
}
