// 고정 공휴일 (MM-DD)
const FIXED = new Set([
  '01-01', // 신정
  '03-01', // 삼일절
  '05-05', // 어린이날
  '06-06', // 현충일
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25', // 크리스마스
])

// 음력·대체 공휴일 (YYYY-MM-DD)
const VARIABLE = new Set([
  // 2024 설날
  '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12',
  // 2024 부처님오신날
  '2024-05-15',
  // 2024 추석
  '2024-09-16', '2024-09-17', '2024-09-18',

  // 2025 설날
  '2025-01-28', '2025-01-29', '2025-01-30',
  // 2025 삼일절 대체
  '2025-03-03',
  // 2025 부처님오신날 대체 (어린이날과 겹침)
  '2025-05-06',
  // 2025 추석
  '2025-10-05', '2025-10-06', '2025-10-07',
  // 2025 추석 대체
  '2025-10-08',

  // 2026 설날
  '2026-02-16', '2026-02-17', '2026-02-18',
  // 2026 삼일절 대체
  '2026-03-02',
  // 2026 부처님오신날 대체
  '2026-05-25',
  // 2026 현충일 대체
  '2026-06-08',
  // 2026 광복절 대체
  '2026-08-17',
  // 2026 추석
  '2026-09-24', '2026-09-25', '2026-09-26',
  // 2026 추석 대체
  '2026-09-28',
  // 2026 개천절 대체
  '2026-10-05',

  // 2027 설날
  '2027-02-05', '2027-02-06', '2027-02-07',
  // 2027 부처님오신날
  '2027-05-13',
  // 2027 추석
  '2027-09-14', '2027-09-15', '2027-09-16',
])

export function isHoliday(year, month, day) {
  const mmdd = String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  if (FIXED.has(mmdd)) return true
  return VARIABLE.has(`${year}-${mmdd}`)
}

export function isWeekend(year, month, day) {
  const dow = new Date(year, month, day).getDay()
  return dow === 0 || dow === 6
}

export function isRest(year, month, day) {
  return isWeekend(year, month, day) || isHoliday(year, month, day)
}

// 해당 월의 넷째 주 금요일 날짜 반환
export function fourthFriday(year, month) {
  let count = 0
  const last = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= last; d++) {
    if (new Date(year, month, d).getDay() === 5) {
      count++
      if (count === 4) return d
    }
  }
  return null
}
