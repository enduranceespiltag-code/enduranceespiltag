import { useStore, removeMonth } from '../store/useStore'

// ─── Helpers ────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function fmt(value) {
  if (value == null || value === 0) return '—'
  return BRL.format(value)
}

function fmtTotal(value) {
  return BRL.format(value ?? 0)
}

// Preferred display order for Carteira Simples siglas
const SIMPLE_ORDER = ['SPL', '001', '033', 'USA', '0']

function siglaLabel(s) {
  return s
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Dashboard({ onImport }) {
  const { months } = useStore()

  // Only months that have been processed (have parsed data)
  const processedMonths = [...months]
    .filter(m => m.data)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

  if (processedMonths.length === 0) {
    return <EmptyState onImport={onImport} />
  }

  // Collect all unique siglas across every month
  const simpleSiglaSet = new Set()
  const descontadoSiglaSet = new Set()

  processedMonths.forEach(m => {
    Object.keys(m.data.carteiraSimplesDetail ?? {}).forEach(s => simpleSiglaSet.add(s))
    Object.keys(m.data.descontadoDetail ?? {}).forEach(s => descontadoSiglaSet.add(s))
  })

  // Sort: follow preferred order, then alphabetical for the rest
  const simpleSiglas = [...simpleSiglaSet].sort((a, b) => {
    const ia = SIMPLE_ORDER.indexOf(a)
    const ib = SIMPLE_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const descontadoSiglas = [...descontadoSiglaSet].sort((a, b) => a.localeCompare(b))

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse min-w-max">

        {/* ── Head ── */}
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-slate-700 text-left px-5 py-3.5 text-xs font-semibold text-slate-200 uppercase tracking-wider min-w-[220px]">
              Categoria
            </th>
            {processedMonths.map(m => (
              <th
                key={m.id}
                className="bg-slate-700 text-right px-5 py-3.5 text-xs font-semibold text-slate-200 uppercase tracking-wider min-w-[175px] whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{m.label}</span>
                  <button
                    onClick={() => removeMonth(m.id)}
                    title="Remover mês"
                    className="flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>

          {/* ══════════════════════════════════════════ */}
          {/*  SECTION 1 – CONSOLIDADO                  */}
          {/* ══════════════════════════════════════════ */}
          <SectionHeader label="Consolidado" colSpan={processedMonths.length + 1} />

          {/* Carteira Simples */}
          <DataRow
            label="Carteira Simples"
            months={processedMonths}
            getValue={m => m.data.carteiraSimplesTotal}
            format={fmtTotal}
            className="font-medium"
          />

          {/* Descontado */}
          <DataRow
            label="Descontado"
            months={processedMonths}
            getValue={m => m.data.descontadoTotal}
            format={fmtTotal}
            className="font-medium"
          />

          {/* Total Geral */}
          <DataRow
            label="Total Geral"
            months={processedMonths}
            getValue={m => m.data.total}
            format={fmtTotal}
            className="font-bold bg-blue-600 text-white"
            cellClassName="bg-blue-600 text-white"
            isTotal
          />

          {/* ══════════════════════════════════════════ */}
          {/*  SECTION 2 – CARTEIRA SIMPLES DETALHAMENTO*/}
          {/* ══════════════════════════════════════════ */}
          <SectionHeader label="Carteira Simples — Detalhamento" colSpan={processedMonths.length + 1} />

          {simpleSiglas.map(s => (
            <DataRow
              key={s}
              label={siglaLabel(s)}
              months={processedMonths}
              getValue={m => m.data.carteiraSimplesDetail?.[s]}
              format={fmt}
              indent
            />
          ))}

          <DataRow
            label="Subtotal Carteira Simples"
            months={processedMonths}
            getValue={m => m.data.carteiraSimplesTotal}
            format={fmtTotal}
            isSubtotal
          />

          {/* ══════════════════════════════════════════ */}
          {/*  SECTION 3 – DESCONTADO DETALHAMENTO      */}
          {/* ══════════════════════════════════════════ */}
          <SectionHeader label="Descontado — Detalhamento" colSpan={processedMonths.length + 1} />

          {descontadoSiglas.map(s => (
            <DataRow
              key={s}
              label={siglaLabel(s)}
              months={processedMonths}
              getValue={m => m.data.descontadoDetail?.[s]}
              format={fmt}
              indent
            />
          ))}

          <DataRow
            label="Subtotal Descontado"
            months={processedMonths}
            getValue={m => m.data.descontadoTotal}
            format={fmtTotal}
            isSubtotal
          />

        </tbody>
      </table>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label, colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="sticky left-0 z-10 bg-slate-100 px-5 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-t border-b border-slate-200"
      >
        {label}
      </td>
    </tr>
  )
}

function DataRow({
  label,
  months,
  getValue,
  format,
  indent = false,
  className = '',
  cellClassName = '',
  isTotal = false,
  isSubtotal = false,
}) {
  const rowBase = isTotal
    ? ''
    : 'border-b border-slate-100 hover:bg-slate-50 transition-colors'

  const labelCx = [
    'sticky left-0 z-10 px-5 py-3 whitespace-nowrap border-r border-slate-100',
    indent        ? 'pl-8 text-slate-500'             : 'text-slate-700',
    isTotal       ? 'bg-blue-600 text-white font-bold' : '',
    isSubtotal    ? 'bg-slate-50 text-slate-700 font-semibold border-t border-slate-200' : '',
    !isTotal && !isSubtotal ? 'bg-white' : '',
    className,
  ].join(' ')

  const valueCx = (base) => [
    'px-5 py-3 text-right tabular-nums whitespace-nowrap',
    isTotal    ? 'bg-blue-600 text-white font-bold'                            : '',
    isSubtotal ? 'bg-slate-50 text-slate-800 font-semibold border-t border-slate-200' : '',
    !isTotal && !isSubtotal ? (indent ? 'text-slate-600' : 'text-slate-800 font-medium') : '',
    base,
  ].join(' ')

  return (
    <tr className={rowBase}>
      <td className={labelCx}>
        {label}
      </td>
      {months.map(m => {
        const value = getValue(m)
        return (
          <td
            key={m.id}
            className={valueCx(cellClassName)}
          >
            {format(value)}
          </td>
        )
      })}
    </tr>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onImport }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 mb-5">
        <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum fechamento importado</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6">
        Importe o CSV do fechamento mensal para visualizar a análise comparativa mês a mês.
      </p>
      <button
        onClick={onImport}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Importar primeiro fechamento
      </button>
    </div>
  )
}
