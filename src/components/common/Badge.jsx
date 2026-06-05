const PRESETS = {
  // task status
  todo:         { bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400'   },
  in_progress:  { bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500'   },
  review:       { bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-500'  },
  waiting_build:{ bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500' },
  testing:      { bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' },
  done:         { bg: 'bg-emerald-50',  text: 'text-emerald-700',dot: 'bg-emerald-500'},

  // priority
  low:          { bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400'   },
  medium:       { bg: 'bg-sky-50',      text: 'text-sky-700',    dot: 'bg-sky-500'    },
  high:         { bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500' },
  urgent:       { bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-500'    },

  // build env
  dev:          { bg: 'bg-slate-100',   text: 'text-slate-700',  dot: 'bg-slate-500'  },
  staging:      { bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' },
  production:   { bg: 'bg-rose-50',     text: 'text-rose-700',   dot: 'bg-rose-500'   },

  // build status
  pending:      { bg: 'bg-yellow-50',   text: 'text-yellow-700', dot: 'bg-yellow-500' },
  building:     { bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500'   },
  success:      { bg: 'bg-emerald-50',  text: 'text-emerald-700',dot: 'bg-emerald-500'},
  failed:       { bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-500'    },
}

export default function Badge({ tone = 'todo', children, dot = true }) {
  const cls = PRESETS[tone] || PRESETS.todo
  return (
    <span className={`badge ${cls.bg} ${cls.text}`}>
      {dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls.dot}`} />}
      {children}
    </span>
  )
}
