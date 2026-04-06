const STATUS_MAP = {
  imported: { label: 'Importado', color: 'bg-amber-100 text-amber-700' },
  processed: { label: 'Processado', color: 'bg-green-100 text-green-700' },
  error: { label: 'Erro', color: 'bg-red-100 text-red-700' },
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MonthCard({ entry, onClick }) {
  const status = STATUS_MAP[entry.status] || STATUS_MAP.imported

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Icon + info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-base">{entry.label}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{entry.fileName}</p>
          </div>
        </div>

        {/* Status + date */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
          <span className="text-xs text-slate-400">{formatDate(entry.importedAt)}</span>
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="flex items-center justify-end mt-3 text-slate-300 group-hover:text-blue-400 transition-colors">
        <span className="text-xs mr-1">Ver detalhes</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
