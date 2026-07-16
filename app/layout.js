import './globals.css'

export const metadata = {
  title: 'Lunch Friend — 팀 식사 스케줄러',
  description: '팀원들과 식사 일정을 미리 공유하는 달력',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
