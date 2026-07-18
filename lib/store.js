// Shared state store.
// In production it uses Upstash Redis. When env vars are absent
// (e.g. local `next dev`) it falls back to a JSON file under /tmp.

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const STATE_KEY = 'mealfriend:state'

const DEFAULT_STATE = {
  members: [], // [{ id, name, color }]
  schedule: {}, // { 'YYYY-MM-DD': [memberId, ...] }
  memos: [], // [{ id, ts, author, color, text }]
}

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

// ---- Upstash Redis backend ----
async function redisGet() {
  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  const state = await redis.get(STATE_KEY)
  return state || DEFAULT_STATE
}

async function redisSet(state) {
  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  await redis.set(STATE_KEY, state)
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
  const state = hasRedis ? await redisGet() : await fileGet()
  // Ensure shape is complete even if an older/partial doc was stored.
  return { ...DEFAULT_STATE, ...state }
}

export async function setState(state) {
  if (hasRedis) await redisSet(state)
  else await fileSet(state)
  return state
}
