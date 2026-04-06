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
  const vencidoBancoSet = new Set()

  processedMonths.forEach(m => {
    Object.keys(m.data.carteiraSimplesDetail ?? {}).forEach(s => simpleSiglaSet.add(s))
    Object.keys(m.data.descontadoDetail ?? {}).forEach(s => descontadoSiglaSet.add(s))
    Object.keys(m.data.vencidos?.porBanco ?? {}).forEach(s => vencidoBancoSet.add(s))
  })

  const simpleSiglas = [...simpleSiglaSet].sort((a, b) => {
    const ia = SIMPLE_ORDER.indexOf(a)
    const ib = SIMPLE_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const descontadoSiglas = [...descontadoSiglaSet].sort((a, b) => a.localeCompare(b))
  const vencidoBancos    = [...vencidoBancoSet].sort((a, b) => a.localeCompare(b))

  const colSpan = processedMonths.length + 1

  return (
    <div className="space-y-8">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  TABLE 1 — CARTEIRA                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm border-collapse min-w-max">

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
            <SectionHeader label="Consolidado" colSpan={colSpan} />
            <DataRow label="Carteira Simples" months={processedMonths} getValue={m => m.data.carteiraSimplesTotal} format={fmtTotal} className="font-medium" />
            <DataRow label="Descontado"        months={processedMonths} getValue={m => m.data.descontadoTotal}      format={fmtTotal} className="font-medium" />
            <DataRow label="Total Geral"        months={processedMonths} getValue={m => m.data.total}               format={fmtTotal} className="font-bold bg-blue-600 text-white" cellClassName="bg-blue-600 text-white" isTotal />

            <SectionHeader label="Carteira Simples — Detalhamento" colSpan={colSpan} />
            {simpleSiglas.map(s => (
              <DataRow key={s} label={siglaLabel(s)} months={processedMonths} getValue={m => m.data.carteiraSimplesDetail?.[s]} format={fmt} indent />
            ))}
            <DataRow label="Subtotal Carteira Simples" months={processedMonths} getValue={m => m.data.carteiraSimplesTotal} format={fmtTotal} isSubtotal />

            <SectionHeader label="Descontado — Detalhamento" colSpan={colSpan} />
            {descontadoSiglas.map(s => (
              <DataRow key={s} label={siglaLabel(s)} months={processedMonths} getValue={m => m.data.descontadoDetail?.[s]} format={fmt} indent />
            ))}
            <DataRow label="Subtotal Descontado" months={processedMonths} getValue={m => m.data.descontadoTotal} format={fmtTotal} isSubtotal />
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  TABLE 2 — VENCIDOS & A VENCER                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm border-collapse min-w-max">

          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-700 text-left px-5 py-3.5 text-xs font-semibold text-slate-200 uppercase tracking-wider min-w-[220px]">
                Vencimento
              </th>
              {processedMonths.map(m => (
                <th
                  key={m.id}
                  className="bg-slate-700 text-right px-5 py-3.5 text-xs font-semibold text-slate-200 uppercase tracking-wider min-w-[175px] whitespace-nowrap"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {/* ── VENCIDOS ── */}
            <SectionHeader label="Vencidos" colSpan={colSpan} color="red" />
            <DataRow
              label="Total Vencido"
              months={processedMonths}
              getValue={m => m.data.vencidos?.total}
              format={fmtTotal}
              className="font-bold bg-red-600 text-white"
              cellClassName="bg-red-600 text-white"
              isTotal
              totalColor="red"
            />
            <DataRow label="1 a 15 dias"       months={processedMonths} getValue={m => m.data.vencidos?.ate15dias}    format={fmt} indent />
            <DataRow label="16 a 30 dias"       months={processedMonths} getValue={m => m.data.vencidos?.de16a30dias}  format={fmt} indent />
            <DataRow label="31 a 90 dias"       months={processedMonths} getValue={m => m.data.vencidos?.de31a90dias}  format={fmt} indent />
            <DataRow label="91 a 180 dias"      months={processedMonths} getValue={m => m.data.vencidos?.de91a180dias} format={fmt} indent />
            <DataRow label="Mais de 180 dias"   months={processedMonths} getValue={m => m.data.vencidos?.mais180dias}  format={fmt} indent />

            <SectionHeader label="Vencidos por Banco — Detalhamento" colSpan={colSpan} />
            {vencidoBancos.map(s => (
              <DataRow key={s} label={s} months={processedMonths} getValue={m => m.data.vencidos?.porBanco?.[s]} format={fmt} indent />
            ))}
            <DataRow label="Subtotal Vencido" months={processedMonths} getValue={m => m.data.vencidos?.total} format={fmtTotal} isSubtotal />

            {/* ── A VENCER ── */}
            <SectionHeader label="A Vencer" colSpan={colSpan} color="green" />
            <DataRow
              label="Total a Vencer"
              months={processedMonths}
              getValue={m => m.data.aVencer?.total}
              format={fmtTotal}
              className="font-bold bg-emerald-600 text-white"
              cellClassName="bg-emerald-600 text-white"
              isTotal
              totalColor="green"
            />
            <DataRow label="Até 15 dias"       months={processedMonths} getValue={m => m.data.aVencer?.ate15dias}   format={fmt} indent />
            <DataRow label="16 a 30 dias"       months={processedMonths} getValue={m => m.data.aVencer?.de16a30dias} format={fmt} indent />
            <DataRow label="Mais de 30 dias"    months={processedMonths} getValue={m => m.data.aVencer?.mais30dias}  format={fmt} indent />

          </tbody>
        </table>
      </div>

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
  totalColor = 'blue',
}) {
  const totalBg = totalColor === 'red'
    ? 'bg-red-600 text-white font-bold'
    : totalColor === 'green'
      ? 'bg-emerald-600 text-white font-bold'
      : 'bg-blue-600 text-white font-bold'

  const rowBase = isTotal ? '' : 'border-b border-slate-100 hover:bg-slate-50 transition-colors'

  const labelCx = [
    'sticky left-0 z-10 px-5 py-3 whitespace-nowrap border-r border-slate-100',
    indent     ? 'pl-8 text-slate-500'   : 'text-slate-700',
    isTotal    ? totalBg                 : '',
    isSubtotal ? 'bg-slate-50 text-slate-700 font-semibold border-t border-slate-200' : '',
    !isTotal && !isSubtotal ? 'bg-white' : '',
    className,
  ].join(' ')

  const valueCx = (base) => [
    'px-5 py-3 text-right tabular-nums whitespace-nowrap',
    isTotal    ? totalBg : '',
    isSubtotal ? 'bg-slate-50 text-slate-800 font-semibold border-t border-slate-200' : '',
    !isTotal && !isSubtotal ? (indent ? 'text-slate-600' : 'text-slate-800 font-medium') : '',
    base,
  ].join(' ')

  return (
    <tr className={rowBase}>
      <td className={labelCx}>{label}</td>
      {months.map(m => (
        <td key={m.id} className={valueCx(cellClassName)}>
          {format(getValue(m))}
        </td>
      ))}
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
