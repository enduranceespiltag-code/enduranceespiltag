import * as XLSX from 'xlsx'

// ─── Classification rules ────────────────────────────────────────────────────

const SIMPLE_PREFIXES = ['SPL', 'USA', '001', '033']

function isCarteiraSimples(bcoStRaw) {
  const t = String(bcoStRaw ?? '').trim()
  if (t === '' || t === '0') return true
  return SIMPLE_PREFIXES.some(prefix => t.toUpperCase().startsWith(prefix))
}

function getSigla(bcoStRaw) {
  const t = String(bcoStRaw ?? '').trim()
  if (t === '' || t === '0') return '0'
  return t.split(/\s+/)[0] || '0'
}

// ─── Value parsing ───────────────────────────────────────────────────────────

function parseValue(raw) {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number') return raw
  // Brazilian text format: "1.234,56" → 1234.56
  const cleaned = String(raw).trim().replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

// ─── Header detection ────────────────────────────────────────────────────────
// Finds the index of the header row (the one that contains "Bco St" or
// "Valor Original") and returns the first DATA row index.

function findDataStart(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].join('').toLowerCase()
    if (joined.includes('bco st') || joined.includes('valor original')) {
      return i + 1 // data starts on the row AFTER the header
    }
  }
  // Fallback: skip 4 rows (3 metadata + 1 header)
  return 4
}

// ─── Core aggregation (shared by CSV and XLSX) ───────────────────────────────

function aggregateRows(rows, colH = 7, colI = 8) {
  let carteiraSimplesTotal = 0
  let descontadoTotal = 0
  const carteiraSimplesDetail = {}
  const descontadoDetail = {}

  for (const row of rows) {
    const bcoStRaw = row[colH]
    const valor    = parseValue(row[colI])
    if (!valor) continue

    const sigla = getSigla(bcoStRaw)

    if (isCarteiraSimples(bcoStRaw)) {
      carteiraSimplesTotal += valor
      carteiraSimplesDetail[sigla] = (carteiraSimplesDetail[sigla] || 0) + valor
    } else {
      descontadoTotal += valor
      descontadoDetail[sigla] = (descontadoDetail[sigla] || 0) + valor
    }
  }

  return {
    carteiraSimplesTotal,
    descontadoTotal,
    total: carteiraSimplesTotal + descontadoTotal,
    carteiraSimplesDetail,
    descontadoDetail,
  }
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

export function parseCSVData(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  const allRows = clean
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.split(';'))

  const dataStart = findDataStart(allRows)
  return aggregateRows(allRows.slice(dataStart))
}

// ─── XLSX parser ─────────────────────────────────────────────────────────────

export function parseXLSXData(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellText: false, cellDates: false })

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' })
    .filter(r => r.some(c => c !== ''))

  const dataStart = findDataStart(allRows)
  return aggregateRows(allRows.slice(dataStart))
}

// ─── Unified entry point ─────────────────────────────────────────────────────

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const isXLSX = /\.(xlsx|xls|xlsm)$/i.test(file.name)
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))

    if (isXLSX) {
      reader.onload = (e) => {
        try { resolve(parseXLSXData(e.target.result)) }
        catch { reject(new Error('Erro ao processar o arquivo Excel. Verifique o formato.')) }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = (e) => {
        try { resolve(parseCSVData(e.target.result)) }
        catch { reject(new Error('Erro ao processar o arquivo CSV. Verifique o formato.')) }
      }
      reader.readAsText(file, 'UTF-8')
    }
  })
}
