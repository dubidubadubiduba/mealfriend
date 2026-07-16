// Shared state store.
// In production (Vercel) it uses Vercel KV. When KV env vars are absent
// (e.g. local `next dev`) it falls back to a JSON file under /tmp so the
// app still works end-to-end without any setup.

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const STATE_KEY = 'mealfriend:state'

const DEFAULT_STATE = {
  members: [], // [{ id, name, color }]
  schedule: {}, // { 'YYYY-MM-DD': [memberId, ...] }
  history: [], // [{ ts, text }]
}

const hasKV =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

// ---- Vercel KV backend ----
async function kvGet() {
  const { kv } = await import('@vercel/kv')
  const state = await kv.get(STATE_KEY)
  return state || DEFAULT_STATE
}

async function kvSet(state) {
  const { kv } = await import('@vercel/kv')
  await kv.set(STATE_KEY, state)
}

// ---- Local file fallback ----
const FILE = path.join(os.tmpdir(), 'mealfriend-state.json')

async function fileGet() {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return DEFAULT_STATE
  }
}

async function fileSet(state) {
  await fs.writeFile(FILE, JSON.stringify(state), 'utf8')
}

export async function getState() {
  const state = hasKV ? await kvGet() : await fileGet()
  // Ensure shape is complete even if an older/partial doc was stored.
  return { ...DEFAULT_STATE, ...state }
}

export async function setState(state) {
  if (hasKV) await kvSet(state)
  else await fileSet(state)
  return state
}
