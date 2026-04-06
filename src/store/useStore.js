import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── In-memory state ─────────────────────────────────────────────────────────

let _state = []
let _loading = true
let _listeners = []

function notify() {
  _listeners.forEach(fn => fn())
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

function fromRow(row) {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    label: row.label,
    fileName: row.file_name,
    importedAt: row.imported_at,
    status: row.status,
    data: row.data,
  }
}

function toRow(entry) {
  return {
    id: entry.id,
    month: entry.month,
    year: entry.year,
    label: entry.label,
    file_name: entry.fileName,
    imported_at: entry.importedAt,
    status: entry.status,
    data: entry.data,
  }
}

// ─── Initial load ─────────────────────────────────────────────────────────────

async function loadFromSupabase() {
  const { data, error } = await supabase
    .from('fechamento_mensal')
    .select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true })

  if (!error && data) {
    _state = data.map(fromRow)
  }
  _loading = false
  notify()
}

loadFromSupabase()

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function addMonth(entry) {
  // Optimistic update
  _state = [..._state, entry]
  notify()

  const { error } = await supabase
    .from('fechamento_mensal')
    .insert(toRow(entry))

  if (error) {
    // Rollback
    _state = _state.filter(m => m.id !== entry.id)
    notify()
    throw new Error('Erro ao salvar no banco de dados.')
  }
}

export async function replaceMonth(entry) {
  // Optimistic update
  _state = _state.map(m => m.id === entry.id ? entry : m)
  notify()

  const { error } = await supabase
    .from('fechamento_mensal')
    .upsert(toRow(entry))

  if (error) {
    // Rollback: reload from DB
    loadFromSupabase()
    throw new Error('Erro ao atualizar no banco de dados.')
  }
}

export async function removeMonth(id) {
  // Optimistic update
  const prev = _state
  _state = _state.filter(m => m.id !== id)
  notify()

  const { error } = await supabase
    .from('fechamento_mensal')
    .delete()
    .eq('id', id)

  if (error) {
    // Rollback
    _state = prev
    notify()
  }
}

export function monthExists(id) {
  return _state.some(m => m.id === id)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStore() {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const listener = () => forceRender(n => n + 1)
    _listeners.push(listener)
    return () => {
      _listeners = _listeners.filter(l => l !== listener)
    }
  }, [])

  return { months: _state, loading: _loading }
}
