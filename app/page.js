'use client'

import { useEffect, useMemo, useState } from 'react'
import { PALETTE, nextColor } from '@/lib/colors'
import { WEEKDAYS, dateKey, monthGrid, monthLabel } from '@/lib/dates'

const MAX_MEMBERS = 9

// Small stable id without external deps.
function makeId() {
  return 'm' + Math.random().toString(36).slice(2, 9)
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [schedule, setSchedule] = useState({})
  const [history, setHistory] = useState([])

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const [selectedId, setSelectedId] = useState(null)
  const [newName, setNewName] = useState('')

  // Recurring form
  const [recMember, setRecMember] = useState('')
  const [recDays, setRecDays] = useState([]) // weekday indexes 0-6
  const [recStart, setRecStart] = useState('')
  const [recEnd, setRecEnd] = useState('')

  // ---- load ----
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((s) => {
        setMembers(s.members || [])
        setSchedule(s.schedule || {})
        setHistory(s.history || [])
      })
      .finally(() => setLoading(false))
  }, [])

  // ---- persist helper ----
  function persist(next, logText) {
    const nextHistory = logText
      ? [{ ts: new Date().toISOString(), text: logText }, ...history].slice(0, 100)
      : history

    if (next.members) setMembers(next.members)
    if (next.schedule) setSchedule(next.schedule)
    if (logText) setHistory(nextHistory)

    const doc = {
      members: next.members ?? members,
      schedule: next.schedule ?? schedule,
      history: nextHistory,
    }
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
  }

  const memberById = useMemo(() => {
    const map = {}
    members.forEach((m) => (map[m.id] = m))
    return map
  }, [members])

  // ---- member ops ----
  function addMember() {
    const name = newName.trim()
    if (!name) return
    if (members.length >= MAX_MEMBERS) {
      alert(`팀원은 최대 ${MAX_MEMBERS}명까지 추가할 수 있어요.`)
      return
    }
    const m = { id: makeId(), name, color: nextColor(members) }
    persist({ members: [...members, m] }, `팀원 추가: ${name}`)
    setNewName('')
  }

  function removeMember(id) {
    const m = memberById[id]
    if (!m) return
    if (!confirm(`'${m.name}' 팀원을 삭제할까요? 모든 날짜에서도 빠집니다.`)) return
    const nextSchedule = {}
    for (const [k, ids] of Object.entries(schedule)) {
      const filtered = ids.filter((x) => x !== id)
      if (filtered.length) nextSchedule[k] = filtered
    }
    if (selectedId === id) setSelectedId(null)
    persist({ members: members.filter((x) => x.id !== id), schedule: nextSchedule }, `팀원 삭제: ${m.name}`)
  }

  // ---- cell ops ----
  function addToCell(key, memberId) {
    const ids = schedule[key] || []
    if (ids.includes(memberId)) return
    if (ids.length >= MAX_MEMBERS) return
    const next = { ...schedule, [key]: [...ids, memberId] }
    persist({ schedule: next }, `${key} 추가: ${memberById[memberId]?.name}`)
  }

  function removeFromCell(key, memberId) {
    const ids = schedule[key] || []
    const filtered = ids.filter((x) => x !== memberId)
    const next = { ...schedule }
    if (filtered.length) next[key] = filtered
    else delete next[key]
    persist({ schedule: next }, `${key} 제외: ${memberById[memberId]?.name}`)
  }

  function onCellClick(key) {
    if (!selectedId) return
    addToCell(key, selectedId)
  }

  // ---- bulk ops (current month) ----
  function fillMonth() {
    if (!members.length) return
    const cells = monthGrid(view.year, view.month).filter(Boolean)
    const next = { ...schedule }
    cells.forEach((d) => {
      next[dateKey(view.year, view.month, d)] = members.map((m) => m.id)
    })
    persist({ schedule: next }, `${monthLabel(view.year, view.month)} 전체 채우기`)
  }

  function clearMonth() {
    if (!confirm(`${monthLabel(view.year, view.month)}의 모든 배치를 지울까요?`)) return
    const cells = monthGrid(view.year, view.month).filter(Boolean)
    const next = { ...schedule }
    cells.forEach((d) => delete next[dateKey(view.year, view.month, d)])
    persist({ schedule: next }, `${monthLabel(view.year, view.month)} 전체 빼기`)
  }

  // ---- recurring ----
  function applyRecurring() {
    if (!recMember) return alert('반복시킬 팀원을 선택하세요.')
    if (!recDays.length) return alert('반복 요일을 하나 이상 선택하세요.')
    if (!recStart || !recEnd) return alert('시작일과 종료일을 입력하세요.')
    const start = new Date(recStart + 'T00:00:00')
    const end = new Date(recEnd + 'T00:00:00')
    if (start > end) return alert('종료일이 시작일보다 빠릅니다.')

    const next = { ...schedule }
    let count = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!recDays.includes(d.getDay())) continue
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
      const ids = next[key] || []
      if (!ids.includes(recMember) && ids.length < MAX_MEMBERS) {
        next[key] = [...ids, recMember]
        count++
      }
    }
    const dayNames = recDays.map((i) => WEEKDAYS[i]).join('·')
    persist({ schedule: next }, `반복 배치: ${memberById[recMember]?.name} 매주 ${dayNames} (${count}일)`)
    alert(`${count}일에 배치했습니다.`)
  }

  function toggleRecDay(i) {
    setRecDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
  }

  // ---- month nav ----
  function shiftMonth(delta) {
    setView((v) => {
      const m = v.month + delta
      const year = v.year + Math.floor(m / 12)
      const month = ((m % 12) + 12) % 12
      return { year, month }
    })
  }

  const cells = monthGrid(view.year, view.month)
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  if (loading) return <div className="loading">불러오는 중…</div>

  return (
    <div className="layout">
      {/* ---------- Sidebar ---------- */}
      <aside className="sidebar">
        <h1 className="brand">🍚 MealFriend</h1>

        <section className="panel">
          <h2>팀원 ({members.length}/{MAX_MEMBERS})</h2>
          <div className="add-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
              placeholder="이름 입력"
              maxLength={10}
            />
            <button className="btn" onClick={addMember}>추가</button>
          </div>
          <p className="hint">
            {selectedId
              ? `선택됨: ${memberById[selectedId]?.name} — 날짜 칸을 눌러 배치`
              : '팀원을 눌러 선택한 뒤 날짜 칸을 누르세요'}
          </p>
          <div className="member-list">
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <button
                  className={'name-btn' + (selectedId === m.id ? ' active' : '')}
                  style={{ background: m.color }}
                  onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                >
                  {m.name}
                </button>
                <button className="del" onClick={() => removeMember(m.id)} title="삭제">✕</button>
              </div>
            ))}
            {!members.length && <p className="empty">아직 팀원이 없어요.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>전체 ({monthLabel(view.year, view.month)})</h2>
          <div className="btn-col">
            <button className="btn wide" onClick={fillMonth}>전체 채우기</button>
            <button className="btn wide ghost" onClick={clearMonth}>전체 빼기</button>
          </div>
        </section>

        <section className="panel">
          <h2>반복 일정 (매주)</h2>
          <select value={recMember} onChange={(e) => setRecMember(e.target.value)}>
            <option value="">팀원 선택</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="weekday-row">
            {WEEKDAYS.map((w, i) => (
              <button
                key={i}
                className={'wd' + (recDays.includes(i) ? ' on' : '')}
                onClick={() => toggleRecDay(i)}
              >
                {w}
              </button>
            ))}
          </div>
          <label className="field">시작일<input type="date" value={recStart} onChange={(e) => setRecStart(e.target.value)} /></label>
          <label className="field">종료일<input type="date" value={recEnd} onChange={(e) => setRecEnd(e.target.value)} /></label>
          <button className="btn wide" onClick={applyRecurring}>반복 적용</button>
        </section>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="main">
        <header className="cal-header">
          <button className="nav" onClick={() => shiftMonth(-1)}>◀ 이전달</button>
          <h2>{monthLabel(view.year, view.month)}</h2>
          <button className="nav" onClick={() => shiftMonth(1)}>다음달 ▶</button>
        </header>

        <div className="weekhead">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={'wh' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{w}</div>
          ))}
        </div>

        <div className="grid">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="cell empty-cell" />
            const key = dateKey(view.year, view.month, d)
            const ids = schedule[key] || []
            const isToday = key === todayKey
            return (
              <div
                key={idx}
                className={'cell' + (isToday ? ' today' : '') + (selectedId ? ' placing' : '')}
                onClick={() => onCellClick(key)}
              >
                <div className="daynum">{d}</div>
                <div className="chips">
                  {ids.map((id) => {
                    const m = memberById[id]
                    if (!m) return null
                    return (
                      <button
                        key={id}
                        className="chip"
                        style={{ background: m.color }}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromCell(key, id)
                        }}
                        title="눌러서 제외"
                      >
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <section className="history">
          <h2>변경 이력</h2>
          <div className="log">
            {history.length === 0 && <p className="empty">아직 변경 이력이 없어요.</p>}
            {history.map((h, i) => (
              <div className="log-row" key={i}>
                <span className="log-time">{formatTime(h.ts)}</span>
                <span className="log-text">{h.text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function formatTime(ts) {
  try {
    const d = new Date(ts)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch {
    return ''
  }
}
