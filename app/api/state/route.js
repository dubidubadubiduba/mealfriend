import { NextResponse } from 'next/server'
import { getState, setState } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await getState()
  return NextResponse.json(state)
}

export async function PUT(request) {
  const body = await request.json()
  // Only persist the known top-level keys.
  const { members = [], schedule = {}, history = [] } = body || {}
  const saved = await setState({ members, schedule, history })
  return NextResponse.json(saved)
}
