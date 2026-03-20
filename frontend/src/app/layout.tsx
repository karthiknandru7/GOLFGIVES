// ============================================================
// ROOT LAYOUT
// ============================================================
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'GolfGives — Play. Win. Give.',
  description: 'A subscription golf platform combining performance tracking, monthly prize draws, and charitable giving.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
