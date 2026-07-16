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
  const [memos, setMemos] = useState([])

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const [selectedId, setSelectedId] = useState(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('') // '' = auto (next available)

  // Recurring form
  const [recMember, setRecMember] = useState('')
  const [recDays, setRecDays] = useState([]) // weekday indexes 0-6
  const [recStart, setRecStart] = useState('')
  const [recEnd, setRecEnd] = useState('')

  // Memo form
  const [memoAuthor, setMemoAuthor] = useState('')
  const [memoText, setMemoText] = useState('')

  // Mobile-specific UI state
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetKey, setSheetKey] = useState(null) // day whose bottom-sheet is open

  // ---- responsive detection ----
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // ---- load ----
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((s) => {
        setMembers(s.members || [])
        setSchedule(s.schedule || {})
        setMemos(s.memos || [])
      })
      .finally(() => setLoading(false))
  }, [])

  // ---- persist helper (saves whole doc) ----
  function persist(patch) {
    const next = {
      members: patch.members ?? members,
      schedule: patch.schedule ?? schedule,
      memos: patch.memos ?? memos,
    }
    if (patch.members) setMembers(patch.members)
    if (patch.schedule) setSchedule(patch.schedule)
    if (patch.memos) setMemos(patch.memos)
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
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
    const m = { id: makeId(), name, color: newColor || nextColor(members) }
    persist({ members: [...members, m] })
    setNewName('')
    setNewColor('')
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
    if (memoAuthor === id) setMemoAuthor('')
    persist({ members: members.filter((x) => x.id !== id), schedule: nextSchedule })
  }

  // ---- cell ops ----
  function addToCell(key, memberId) {
    const ids = schedule[key] || []
    if (ids.includes(memberId)) return
    if (ids.length >= MAX_MEMBERS) return
    persist({ schedule: { ...schedule, [key]: [...ids, memberId] } })
  }

  function removeFromCell(key, memberId) {
    const ids = schedule[key] || []
    const filtered = ids.filter((x) => x !== memberId)
    const next = { ...schedule }
    if (filtered.length) next[key] = filtered
    else delete next[key]
    persist({ schedule: next })
  }

  function toggleMemberOnDay(key, memberId) {
    const ids = schedule[key] || []
    if (ids.includes(memberId)) removeFromCell(key, memberId)
    else addToCell(key, memberId)
  }

  function onCellClick(key) {
    if (isMobile) {
      setSheetKey(key) // open the day sheet
      return
    }
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
    persist({ schedule: next })
  }

  function clearMonth() {
    if (!confirm(`${monthLabel(view.year, view.month)}의 모든 배치를 지울까요?`)) return
    const cells = monthGrid(view.year, view.month).filter(Boolean)
    const next = { ...schedule }
    cells.forEach((d) => delete next[dateKey(view.year, view.month, d)])
    persist({ schedule: next })
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
    persist({ schedule: next })
    alert(`${count}일에 배치했습니다.`)
  }

  function toggleRecDay(i) {
    setRecDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
  }

  // ---- memo ops ----
  function addMemo() {
    const text = memoText.trim()
    if (!text) return
    const m = memberById[memoAuthor]
    const memo = {
      id: makeId(),
      ts: new Date().toISOString(),
      author: m ? m.name : '익명',
      color: m ? m.color : '#e2e5ea',
      text,
    }
    persist({ memos: [memo, ...memos].slice(0, 100) })
    setMemoText('')
  }

  function removeMemo(id) {
    persist({ memos: memos.filter((x) => x.id !== id) })
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

  // ---------- shared control panels (desktop sidebar & mobile drawer) ----------
  const controls = (
    <>
      <section className="panel">
        <h2>팀원</h2>
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
        <div className="swatches">
          {PALETTE.map((c) => {
            const active = (newColor || nextColor(members)) === c
            return (
              <button
                key={c}
                className={'sw' + (active ? ' on' : '')}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
                title="배경색 선택"
              />
            )
          })}
        </div>
        {!isMobile && (
          <p className="hint">
            {selectedId
              ? `선택됨: ${memberById[selectedId]?.name} — 날짜 칸을 눌러 배치`
              : '팀원을 눌러 선택한 뒤 날짜 칸을 누르세요'}
          </p>
        )}
        {isMobile && <p className="hint">날짜를 눌러 그날 참석자를 켜고 끄세요.</p>}
        <div className="member-list">
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <button
                className={'name-btn' + (!isMobile && selectedId === m.id ? ' active' : '')}
                style={{ background: m.color }}
                onClick={() => !isMobile && setSelectedId(selectedId === m.id ? null : m.id)}
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
    </>
  )

  const calendar = (
    <>
      <header className="cal-header">
        <button className="nav" onClick={() => shiftMonth(-1)}>{isMobile ? '◀' : '◀ 이전달'}</button>
        <h2>{monthLabel(view.year, view.month)}</h2>
        <button className="nav" onClick={() => shiftMonth(1)}>{isMobile ? '▶' : '다음달 ▶'}</button>
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
              className={'cell' + (isToday ? ' today' : '') + (!isMobile && selectedId ? ' placing' : '')}
              onClick={() => onCellClick(key)}
            >
              <div className="daynum">{d}</div>
              {isMobile ? (
                <div className="dots">
                  {ids.map((id) => {
                    const m = memberById[id]
                    if (!m) return null
                    return <span key={id} className="dot" style={{ background: m.color }} />
                  })}
                </div>
              ) : (
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
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  const memoSection = (
    <section className="memo">
      <h2>메모장</h2>
      <div className="memo-add">
        <select value={memoAuthor} onChange={(e) => setMemoAuthor(e.target.value)}>
          <option value="">익명</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addMemo()}
          placeholder="한 줄 메모…"
          maxLength={80}
        />
        <button className="btn" onClick={addMemo}>등록</button>
      </div>
      <div className="memo-list">
        {memos.length === 0 && <p className="empty">아직 메모가 없어요.</p>}
        {memos.map((m) => (
          <div className="memo-row" key={m.id}>
            <span className="memo-author" style={{ background: m.color }}>{m.author}</span>
            <span className="memo-text">{m.text}</span>
            <span className="memo-time">{formatTime(m.ts)}</span>
            <button className="memo-del" onClick={() => removeMemo(m.id)} title="삭제">✕</button>
          </div>
        ))}
      </div>
    </section>
  )

  // ---------- Mobile layout ----------
  if (isMobile) {
    const sheetIds = sheetKey ? schedule[sheetKey] || [] : []
    return (
      <div className="m-layout">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="메뉴">☰</button>
          <span className="topbar-title">🍚 Lunch Friend</span>
          <span className="topbar-spacer" />
        </header>

        <main className="m-main">
          {calendar}
          {memoSection}
        </main>

        {drawerOpen && (
          <div className="overlay" onClick={() => setDrawerOpen(false)}>
            <aside className="drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head">
                <h1 className="brand">🍚 Lunch Friend</h1>
                <button className="close" onClick={() => setDrawerOpen(false)}>✕</button>
              </div>
              {controls}
            </aside>
          </div>
        )}

        {sheetKey && (
          <div className="overlay bottom" onClick={() => setSheetKey(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <strong>{sheetKey} 참석자</strong>
                <button className="close" onClick={() => setSheetKey(null)}>완료</button>
              </div>
              {!members.length && <p className="empty">먼저 ☰ 메뉴에서 팀원을 추가하세요.</p>}
              <div className="sheet-list">
                {members.map((m) => {
                  const on = sheetIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      className={'sheet-item' + (on ? ' on' : '')}
                      style={{ background: m.color }}
                      onClick={() => toggleMemberOnDay(sheetKey, m.id)}
                    >
                      <span>{m.name}</span>
                      <span className="check">{on ? '✓' : ''}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- Desktop layout ----------
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand">🍚 Lunch Friend</h1>
        {controls}
      </aside>
      <main className="main">
        {calendar}
        {memoSection}
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
