import { useState, useRef } from 'react'
import { addMonth, replaceMonth, monthExists } from '../store/useStore'
import { parseFile } from '../utils/parseCSV'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function generateMonthOptions() {
  const options = []
  const now = new Date()
  let month = now.getMonth()
  let year = now.getFullYear()

  for (let i = 0; i < 36; i++) {
    options.push({
      value: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${MONTHS[month]} / ${year}`,
    })
    month--
    if (month < 0) { month = 11; year-- }
  }

  return options
}

export default function ImportModal({ onClose }) {
  const [files, setFiles] = useState([])   // [{ file, monthId, id }]
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmIds, setConfirmIds] = useState([])  // monthIds that already exist
  const fileInputRef = useRef(null)
  const monthOptions = generateMonthOptions()

  // ── File picking ────────────────────────────────────────────────────────────

  function addFiles(newFiles) {
    const accepted = Array.from(newFiles).filter(f =>
      /\.(csv|xlsx|xls|xlsm)$/i.test(f.name)
    )
    if (accepted.length === 0) {
      setError('Selecione arquivos Excel (.xlsx) ou CSV.')
      return
    }
    setError('')
    setFiles(prev => {
      const existingNames = new Set(prev.map(e => e.file.name))
      const toAdd = accepted
        .filter(f => !existingNames.has(f.name))
        .map(f => ({ file: f, monthId: '', id: `${f.name}-${Date.now()}-${Math.random()}` }))
      return [...prev, ...toAdd]
    })
  }

  function handleFileChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function handleDragOver(e) { e.preventDefault(); setDragging(true) }
  function handleDragLeave() { setDragging(false) }

  function removeFile(id) {
    setFiles(prev => prev.filter(e => e.id !== id))
    setConfirmIds([])
  }

  function setMonth(id, monthId) {
    setFiles(prev => prev.map(e => e.id === id ? { ...e, monthId } : e))
    setConfirmIds([])
    setError('')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (files.length === 0) { setError('Adicione pelo menos um arquivo.'); return }

    const unassigned = files.filter(e => !e.monthId)
    if (unassigned.length > 0) {
      setError(`Selecione o mês de referência para todos os arquivos.`)
      return
    }

    // Check for duplicate months (already imported) that haven't been confirmed
    const duplicates = files
      .map(e => e.monthId)
      .filter((id, idx, arr) => arr.indexOf(id) === idx)  // unique
      .filter(id => monthExists(id))

    const unconfirmedDuplicates = duplicates.filter(id => !confirmIds.includes(id))

    if (unconfirmedDuplicates.length > 0) {
      setConfirmIds(unconfirmedDuplicates)
      return
    }

    setLoading(true)
    setError('')

    try {
      for (const entry of files) {
        const data = await parseFile(entry.file)
        const [year, month] = entry.monthId.split('-')

        const record = {
          id: entry.monthId,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          label: `${MONTHS[parseInt(month, 10) - 1]} / ${year}`,
          fileName: entry.file.name,
          importedAt: new Date().toISOString(),
          status: 'processed',
          data,
        }

        if (monthExists(entry.monthId)) {
          await replaceMonth(record)
        } else {
          await addMonth(record)
        }
      }

      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao processar um dos arquivos.')
    } finally {
      setLoading(false)
    }
  }

  const duplicateMonthLabels = confirmIds.map(id => {
    const opt = monthOptions.find(o => o.value === id)
    return opt ? opt.label : id
  })

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Importar fechamento</h2>
            <p className="text-sm text-slate-500 mt-0.5">Adicione um ou mais arquivos e selecione o mês de cada um</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl
              px-6 py-7 cursor-pointer transition-all
              ${dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'}
            `}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Clique para selecionar ou arraste aqui</p>
              <p className="text-xs text-slate-400 mt-0.5">Excel (.xlsx) ou CSV · múltiplos arquivos permitidos</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,text/csv"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{entry.file.name}</p>
                    <p className="text-xs text-slate-400">{(entry.file.size / 1024).toFixed(1)} KB</p>
                  </div>

                  <select
                    value={entry.monthId}
                    onChange={e => setMonth(entry.id, e.target.value)}
                    className="text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione o mês...</option>
                    {monthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeFile(entry.id)}
                    className="p-1 text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    title="Remover arquivo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Duplicate confirmation */}
          {confirmIds.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium mb-1">
                {confirmIds.length === 1 ? 'Este mês já foi importado:' : 'Estes meses já foram importados:'}
              </p>
              <ul className="list-disc list-inside text-amber-700 mb-3 space-y-0.5">
                {duplicateMonthLabels.map(label => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <p className="text-amber-700">Deseja substituir os dados existentes?</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSubmit}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Sim, substituir
                </button>
                <button
                  onClick={() => setConfirmIds([])}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-400">
            {files.length === 0
              ? 'Nenhum arquivo selecionado'
              : `${files.length} arquivo${files.length > 1 ? 's' : ''} selecionado${files.length > 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || files.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Processando...' : 'Importar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
