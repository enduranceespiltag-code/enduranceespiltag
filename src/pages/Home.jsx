import { useState } from 'react'
import { useStore } from '../store/useStore'
import ImportModal from '../components/ImportModal'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const { months, loading } = useStore()
  const [showImport, setShowImport] = useState(false)

  const processedCount = months.filter(m => m.data).length

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800 leading-tight">Fechamento Mensal</h1>
              <p className="text-xs text-slate-400">Contas a Receber · TAG</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {processedCount > 0 && (
              <span className="text-xs text-slate-400">
                {processedCount} {processedCount === 1 ? 'mês' : 'meses'} analisado{processedCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Importar fechamento
            </button>
          </div>

        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">

        {processedCount > 0 && (
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-800">Análise comparativa</h2>
            <p className="text-sm text-slate-500 mt-0.5">Valores em Reais (R$) · coluna I do relatório de contas a receber</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-3">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Carregando dados...
          </div>
        ) : (
          <Dashboard onImport={() => setShowImport(true)} />
        )}

      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
