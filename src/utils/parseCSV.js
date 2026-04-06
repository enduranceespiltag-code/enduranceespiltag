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
  const cleaned = String(raw).trim().replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

// ─── Date parsing ────────────────────────────────────────────────────────────

// Parse "dd/mm/yyyy" or "d/m/yyyy" text → UTC Date
function parseDateBR(str) {
  const s = String(str ?? '').trim()
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return new Date(Date.UTC(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])))
}

// Convert Excel serial number → UTC Date
function xlsxSerialToDate(serial) {
  if (typeof serial !== 'number' || serial <= 0) return null
  return new Date((serial - 25569) * 86400000)
}

// Extract report date from A3: "Emissão: dd/mm/yyyy"
function parseReportDate(allRows) {
  const cell = String(allRows[2]?.[0] ?? '').trim()
  return parseDateBR(cell)
}

// Days between two dates (positive = dueDate is in the past relative to reportDate)
function daysDiff(dueDate, reportDate) {
  return Math.floor((reportDate - dueDate) / 86400000)
}

// ─── Header detection ────────────────────────────────────────────────────────

function findDataStart(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].join('').toLowerCase()
    if (joined.includes('bco st') || joined.includes('valor original')) {
      return i + 1
    }
  }
  return 4
}

// ─── Core aggregation ────────────────────────────────────────────────────────

function aggregateRows(rows, reportDate, isXLSX = false, colG = 6, colH = 7, colI = 8) {
  let carteiraSimplesTotal = 0
  let descontadoTotal = 0
  const carteiraSimplesDetail = {}
  const descontadoDetail = {}

  // Vencidos buckets
  const vencidos = {
    total: 0,
    ate15dias: 0,
    de16a30dias: 0,
    de31a90dias: 0,
    de91a180dias: 0,
    mais180dias: 0,
    porBanco: {},
  }

  // A vencer buckets
  const aVencer = {
    total: 0,
    ate15dias: 0,
    de16a30dias: 0,
    mais30dias: 0,
  }

  for (const row of rows) {
    const bcoStRaw = row[colH]
    const valor    = parseValue(row[colI])
    if (!valor) continue

    const sigla = getSigla(bcoStRaw)

    // ── Carteira Simples / Descontado ──
    if (isCarteiraSimples(bcoStRaw)) {
      carteiraSimplesTotal += valor
      carteiraSimplesDetail[sigla] = (carteiraSimplesDetail[sigla] || 0) + valor
    } else {
      descontadoTotal += valor
      descontadoDetail[sigla] = (descontadoDetail[sigla] || 0) + valor
    }

    // ── Vencimento analysis ──
    if (reportDate) {
      const dueDateRaw = row[colG]
      const dueDate = isXLSX ? xlsxSerialToDate(dueDateRaw) : parseDateBR(dueDateRaw)

      if (dueDate) {
        const days = daysDiff(dueDate, reportDate)

        if (days > 0) {
          // Overdue
          vencidos.total += valor
          vencidos.porBanco[sigla] = (vencidos.porBanco[sigla] || 0) + valor

          if (days <= 15)       vencidos.ate15dias    += valor
          else if (days <= 30)  vencidos.de16a30dias  += valor
          else if (days <= 90)  vencidos.de31a90dias  += valor
          else if (days <= 180) vencidos.de91a180dias += valor
          else                  vencidos.mais180dias  += valor
        } else {
          // Upcoming (due today or future)
          const daysUntil = -days
          aVencer.total += valor

          if (daysUntil <= 15)      aVencer.ate15dias    += valor
          else if (daysUntil <= 30) aVencer.de16a30dias  += valor
          else                      aVencer.mais30dias   += valor
        }
      }
    }
  }

  return {
    carteiraSimplesTotal,
    descontadoTotal,
    total: carteiraSimplesTotal + descontadoTotal,
    carteiraSimplesDetail,
    descontadoDetail,
    vencidos,
    aVencer,
  }
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

export function parseCSVData(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  const allRows = clean
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.split(';'))

  const reportDate = parseReportDate(allRows)
  const dataStart  = findDataStart(allRows)
  return aggregateRows(allRows.slice(dataStart), reportDate, false)
}

// ─── XLSX parser ─────────────────────────────────────────────────────────────

export function parseXLSXData(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellText: false, cellDates: false })

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' })
    .filter(r => r.some(c => c !== ''))

  const reportDate = parseReportDate(allRows)
  const dataStart  = findDataStart(allRows)
  return aggregateRows(allRows.slice(dataStart), reportDate, true)
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
